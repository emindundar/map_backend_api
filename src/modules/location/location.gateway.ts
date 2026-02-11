import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LocationService } from './location.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { WsValidationPipe } from '../../common/pipes/ws-validation.pipe';
import { UpdateLocationDto } from './dto/update-location.dto';
import { SubscribeUserDto } from './dto/subscribe-user.dto';

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const WS_MAX_PAYLOAD_BYTES = parseNumberEnv(
    process.env.WS_MAX_PAYLOAD_BYTES,
    8 * 1024,
);

interface AuthenticatedSocket extends Socket {
    data: {
        user: {
            id: number;
            email: string;
            role: string;
        };
    };
}

@WebSocketGateway({
    namespace: '/location',
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',')
            : '*',
        credentials: true,
    },
    transports: ['websocket'],
    maxHttpBufferSize: WS_MAX_PAYLOAD_BYTES,
})
export class LocationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(LocationGateway.name);

    // Bağlı kullanıcıları takip et: userId -> socketId
    private connectedUsers: Map<number, string> = new Map();

    private readonly ADMIN_ROOM = 'admins';

    private readonly MAX_EVENT_PAYLOAD_BYTES = WS_MAX_PAYLOAD_BYTES;
    private readonly MAX_DEVICE_TIME_SKEW_MS = parseNumberEnv(
        process.env.WS_MAX_DEVICE_TIME_SKEW_MS,
        10 * 60 * 1000,
    );
    private readonly RATE_LIMIT_WINDOW_MS = parseNumberEnv(
        process.env.WS_RATE_LIMIT_WINDOW_MS,
        30_000,
    );
    private readonly RATE_LIMIT_MAX_VIOLATIONS = parseNumberEnv(
        process.env.WS_RATE_LIMIT_MAX_VIOLATIONS,
        5,
    );

    private readonly violationTracker: Map<
        number,
        { count: number; windowStart: number }
    > = new Map();

    // Rate limiting: userId -> son konum gönderim zamanı
    private lastLocationUpdate: Map<number, number> = new Map();
    private readonly MIN_UPDATE_INTERVAL_MS = 1000; // Minimum 1 saniye aralık

    // DB yazımı için rate limiting: userId -> son DB kaydı zamanı
    private lastDbSave: Map<number, number> = new Map();
    private readonly MIN_DB_SAVE_INTERVAL_MS = parseNumberEnv(
        process.env.LOCATION_DB_SAVE_INTERVAL_MS,
        60_000,
    ); // 1 dakika

    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly locationService: LocationService,
    ) { }

    // ═══════════════════════════════════════════════════
    // Lifecycle Events
    // ═══════════════════════════════════════════════════

    afterInit() {
        this.logger.log('🔌 Location WebSocket Gateway initialized');
    }

    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token = this.extractToken(client);

            if (!token) {
                this.logger.warn(`Connection rejected — no token | ${client.id}`);
                client.emit('error', { message: 'Token bulunamadı.' });
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            const user = await this.usersService.findById(payload.sub);

            if (!user) {
                this.logger.warn(`Connection rejected — user not found | ${client.id}`);
                client.emit('error', { message: 'Kullanıcı bulunamadı.' });
                client.disconnect();
                return;
            }

            // Kullanıcı bilgisini socket'e ata
            client.data.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };

            // Kendi room'una katıl (admin takibi için)
            client.join(`user:${payload.sub}`);

            // Admin ise admin odasına katıl
            if (payload.role === 'admin') {
                client.join(this.ADMIN_ROOM);
            }

            // Bağlı kullanıcılar listesini güncelle
            this.connectedUsers.set(payload.sub, client.id);

            this.logger.log(
                `✅ Connected: ${payload.email} (${payload.role}) | Socket: ${client.id}`,
            );

            client.emit('connection_accepted', {
                message: 'Bağlantı başarılı.',
                userId: payload.sub,
            });
        } catch (error) {
            this.logger.warn(
                `Connection rejected — invalid token: ${error.message} | ${client.id}`,
            );
            client.emit('error', { message: 'Geçersiz veya süresi dolmuş token.' });
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        const user = client.data?.user;

        if (user) {
            this.connectedUsers.delete(user.id);
            this.lastLocationUpdate.delete(user.id);
            this.lastDbSave.delete(user.id);
            this.violationTracker.delete(user.id);
            this.logger.log(
                `❌ Disconnected: ${user.email} | Socket: ${client.id}`,
            );
        } else {
            this.logger.log(`❌ Disconnected: unauthenticated | Socket: ${client.id}`);
        }
    }

    // ═══════════════════════════════════════════════════
    // User Events
    // ═══════════════════════════════════════════════════

    @UseGuards(WsJwtGuard)
    @UsePipes(new WsValidationPipe())
    @SubscribeMessage('update_location')
    async handleUpdateLocation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: UpdateLocationDto,
    ) {
        const user = client.data.user;

        const now = Date.now();

        const payloadBytes = this.getPayloadBytes(dto);
        if (payloadBytes > this.MAX_EVENT_PAYLOAD_BYTES) {
            const disconnected = this.registerViolation(user.id, now, client);
            return {
                event: 'error',
                data: {
                    message: disconnected
                        ? 'Gönderim boyutu çok büyük. Bağlantı kapatıldı.'
                        : 'Gönderim boyutu çok büyük.',
                },
            };
        }

        if (!this.isDeviceTimestampValid(dto.deviceTimestamp, now)) {
            const disconnected = this.registerViolation(user.id, now, client);
            return {
                event: 'error',
                data: {
                    message: disconnected
                        ? 'Geçersiz cihaz zaman damgası. Bağlantı kapatıldı.'
                        : 'Geçersiz cihaz zaman damgası.',
                },
            };
        }

        // Rate limiting kontrolü
        const lastUpdate = this.lastLocationUpdate.get(user.id);

        if (lastUpdate && now - lastUpdate < this.MIN_UPDATE_INTERVAL_MS) {
            const disconnected = this.registerViolation(user.id, now, client);
            return {
                event: 'error',
                data: {
                    message: disconnected
                        ? 'Çok sık konum gönderimi. Bağlantı kapatıldı.'
                        : 'Çok sık konum gönderimi. Lütfen bekleyin.',
                },
            };
        }

        this.lastLocationUpdate.set(user.id, now);

        let persisted = false;
        let location: {
            latitude: number;
            longitude: number;
            accuracy: number | null;
            speed: number | null;
            heading: number | null;
            altitude: number | null;
            deviceTimestamp: Date;
            createdAt: Date;
        };

        const lastSave = this.lastDbSave.get(user.id);

        if (!lastSave || now - lastSave >= this.MIN_DB_SAVE_INTERVAL_MS) {
            // DB'ye kaydet (1 dakikada 1 kez)
            const saved = await this.locationService.saveLocation(user.id, dto);
            this.lastDbSave.set(user.id, now);
            persisted = true;
            location = {
                latitude: Number(saved.latitude),
                longitude: Number(saved.longitude),
                accuracy:
                    saved.accuracy !== null && saved.accuracy !== undefined
                        ? Number(saved.accuracy)
                        : null,
                speed:
                    saved.speed !== null && saved.speed !== undefined
                        ? Number(saved.speed)
                        : null,
                heading:
                    saved.heading !== null && saved.heading !== undefined
                        ? Number(saved.heading)
                        : null,
                altitude:
                    saved.altitude !== null && saved.altitude !== undefined
                        ? Number(saved.altitude)
                        : null,
                deviceTimestamp: saved.deviceTimestamp,
                createdAt: saved.createdAt,
            };
        } else {
            // DB'ye yazmadan canlı yayın
            location = {
                latitude: dto.latitude,
                longitude: dto.longitude,
                accuracy: dto.accuracy ?? null,
                speed: dto.speed ?? null,
                heading: dto.heading ?? null,
                altitude: dto.altitude ?? null,
                deviceTimestamp: new Date(dto.deviceTimestamp),
                createdAt: new Date(now),
            };
        }

        // Bu kullanıcının room'undaki herkese (admin'lere) broadcast et
        this.server.to(`user:${user.id}`).emit('location_updated', {
            userId: user.id,
            email: user.email,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            altitude: location.altitude,
            deviceTimestamp: location.deviceTimestamp,
            serverTimestamp: location.createdAt,
        });

        return {
            event: 'location_saved',
            data: { success: true, persisted },
        };
    }

    // ═══════════════════════════════════════════════════
    // Admin Events
    // ═══════════════════════════════════════════════════

    @UseGuards(WsJwtGuard)
    @UsePipes(new WsValidationPipe())
    @SubscribeMessage('subscribe_user')
    async handleSubscribeUser(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SubscribeUserDto,
    ) {
        const admin = client.data.user;

        // Rol kontrolü
        if (admin.role !== 'admin' || !client.rooms?.has(this.ADMIN_ROOM)) {
            throw new WsException('Bu işlem için admin yetkisi gerekli.');
        }

        // Hedef kullanıcının varlığını kontrol et
        const targetUser = await this.usersService.findById(dto.userId);

        if (!targetUser) {
            throw new WsException('Takip edilecek kullanıcı bulunamadı.');
        }

        // Kullanıcının room'una katıl
        client.join(`user:${dto.userId}`);

        this.logger.log(
            `👁️ Admin ${admin.email} subscribed to user:${dto.userId}`,
        );

        // Son konum bilgisini hemen gönder (varsa)
        const lastLocation = await this.locationService.getLastLocation(dto.userId);

        return {
            event: 'subscribed',
            data: {
                success: true,
                userId: dto.userId,
                message: `Kullanıcı ${dto.userId} takibe alındı.`,
                isOnline: this.connectedUsers.has(dto.userId),
                lastLocation: lastLocation
                    ? {
                        latitude: Number(lastLocation.latitude),
                        longitude: Number(lastLocation.longitude),
                        accuracy: lastLocation.accuracy ? Number(lastLocation.accuracy) : null,
                        speed: lastLocation.speed ? Number(lastLocation.speed) : null,
                        heading: lastLocation.heading ? Number(lastLocation.heading) : null,
                        deviceTimestamp: lastLocation.deviceTimestamp,
                        serverTimestamp: lastLocation.createdAt,
                    }
                    : null,
            },
        };
    }

    @UseGuards(WsJwtGuard)
    @UsePipes(new WsValidationPipe())
    @SubscribeMessage('unsubscribe_user')
    async handleUnsubscribeUser(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SubscribeUserDto,
    ) {
        const admin = client.data.user;

        if (admin.role !== 'admin' || !client.rooms?.has(this.ADMIN_ROOM)) {
            throw new WsException('Bu işlem için admin yetkisi gerekli.');
        }

        client.leave(`user:${dto.userId}`);

        this.logger.log(
            `🚫 Admin ${admin.email} unsubscribed from user:${dto.userId}`,
        );

        return {
            event: 'unsubscribed',
            data: {
                success: true,
                userId: dto.userId,
                message: `Kullanıcı ${dto.userId} takipten çıkarıldı.`,
            },
        };
    }

    // ═══════════════════════════════════════════════════
    // Utility Events
    // ═══════════════════════════════════════════════════

    @SubscribeMessage('ping')
    handlePing() {
        return { event: 'pong', data: { timestamp: new Date().toISOString() } };
    }

    /**
     * Bağlı kullanıcı sayısını döndür (sadece admin)
     */
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('get_online_users')
    handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
        const user = client.data.user;

        if (user.role !== 'admin' || !client.rooms?.has(this.ADMIN_ROOM)) {
            throw new WsException('Bu işlem için admin yetkisi gerekli.');
        }

        const onlineUserIds = Array.from(this.connectedUsers.keys());

        return {
            event: 'online_users',
            data: {
                count: onlineUserIds.length,
                userIds: onlineUserIds,
            },
        };
    }

    // ═══════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════

    private getPayloadBytes(dto: UpdateLocationDto): number {
        return Buffer.byteLength(JSON.stringify(dto), 'utf8');
    }

    private isDeviceTimestampValid(deviceTimestamp: string, nowMs: number): boolean {
        const deviceMs = new Date(deviceTimestamp).getTime();
        if (Number.isNaN(deviceMs)) {
            return false;
        }
        return Math.abs(nowMs - deviceMs) <= this.MAX_DEVICE_TIME_SKEW_MS;
    }

    private registerViolation(userId: number, nowMs: number, client: Socket): boolean {
        const next = this.getViolationState(userId, nowMs);
        next.count += 1;
        this.violationTracker.set(userId, next);

        if (next.count >= this.RATE_LIMIT_MAX_VIOLATIONS) {
            client.emit('error', {
                message: 'Çok fazla hatalı istek. Bağlantı kapatıldı.',
            });
            client.disconnect();
            return true;
        }

        return false;
    }

    private getViolationState(
        userId: number,
        nowMs: number,
    ): { count: number; windowStart: number } {
        const current = this.violationTracker.get(userId);
        if (current && nowMs - current.windowStart <= this.RATE_LIMIT_WINDOW_MS) {
            return current;
        }

        return { count: 0, windowStart: nowMs };
    }

    private extractToken(client: Socket): string | null {
        const authToken = client.handshake?.auth?.token;

        if (authToken) {
            const parts = authToken.split(' ');
            return parts.length === 2 && parts[0] === 'Bearer'
                ? parts[1]
                : authToken;
        }

        return null;
    }
}
