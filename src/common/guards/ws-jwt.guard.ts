import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { UsersService } from '../../modules/users/users.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private readonly logger = new Logger(WsJwtGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient();

        try {
            const token = this.extractToken(client);

            if (!token) {
                throw new WsException('Token bulunamadı.');
            }

            const payload = this.jwtService.verify(token);

            // Kullanıcının DB'de hâlâ var olduğunu doğrula
            const user = await this.usersService.findById(payload.sub);

            if (!user) {
                throw new WsException('Kullanıcı bulunamadı.');
            }

            // Socket'e kullanıcı bilgisini ata
            client.data.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };

            return true;
        } catch (error) {
            this.logger.warn(
                `WebSocket auth failed: ${error.message} | Client: ${client.id}`,
            );

            client.emit('error', { message: 'Yetkilendirme başarısız.' });
            client.disconnect();
            return false;
        }
    }

    private extractToken(client: Socket): string | null {
        // auth.token üzerinden al (tek kabul edilen yol)
        const authToken = client.handshake?.auth?.token;

        if (authToken) {
            const [type, token] = authToken.split(' ');
            return type === 'Bearer' ? token : authToken;
        }

        return null;
    }
}
