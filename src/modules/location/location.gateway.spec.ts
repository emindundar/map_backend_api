import { LocationGateway } from './location.gateway';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';

const buildGateway = () => {
    const jwtService = { verify: jest.fn() } as unknown as JwtService;
    const usersService = { findById: jest.fn() } as unknown as UsersService;
    const locationService = {
        saveLocation: jest.fn(),
    } as unknown as LocationService;

    const gateway = new LocationGateway(jwtService, usersService, locationService);

    const server = {
        to: jest.fn().mockImplementation(function () {
            return this;
        }),
        emit: jest.fn(),
    };

    gateway.server = server as any;

    return { gateway, locationService, server };
};

describe('LocationGateway', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('persists at most once per minute and still broadcasts', async () => {
        const { gateway, locationService, server } = buildGateway();
        const client = {
            data: { user: { id: 1, email: 'user@example.com', role: 'user' } },
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        const baseDto: UpdateLocationDto = {
            latitude: 1,
            longitude: 2,
            deviceTimestamp: new Date('2026-02-11T00:00:00Z').toISOString(),
        };

        (locationService.saveLocation as jest.Mock).mockResolvedValue({
            latitude: 1,
            longitude: 2,
            accuracy: null,
            speed: null,
            heading: null,
            altitude: null,
            deviceTimestamp: new Date(baseDto.deviceTimestamp),
            createdAt: new Date('2026-02-11T00:00:00Z'),
        });

        jest.setSystemTime(new Date('2026-02-11T00:00:00Z'));

        const res1 = await gateway.handleUpdateLocation(client, baseDto);

        expect(locationService.saveLocation).toHaveBeenCalledTimes(1);
        expect(server.to).toHaveBeenCalledWith('user:1');
        expect(server.emit).toHaveBeenCalledWith(
            'location_updated',
            expect.objectContaining({
                userId: 1,
                latitude: 1,
                longitude: 2,
            }),
        );
        expect(res1).toEqual({
            event: 'location_saved',
            data: { success: true, persisted: true },
        });

        jest.setSystemTime(new Date('2026-02-11T00:00:02Z'));

        const res2 = await gateway.handleUpdateLocation(client, {
            ...baseDto,
            latitude: 3,
            longitude: 4,
        });

        expect(locationService.saveLocation).toHaveBeenCalledTimes(1);
        expect(server.emit).toHaveBeenLastCalledWith(
            'location_updated',
            expect.objectContaining({
                latitude: 3,
                longitude: 4,
            }),
        );
        expect(res2).toEqual({
            event: 'location_saved',
            data: { success: true, persisted: false },
        });

        (locationService.saveLocation as jest.Mock).mockResolvedValue({
            latitude: 5,
            longitude: 6,
            accuracy: null,
            speed: null,
            heading: null,
            altitude: null,
            deviceTimestamp: new Date(baseDto.deviceTimestamp),
            createdAt: new Date('2026-02-11T00:01:02Z'),
        });

        jest.setSystemTime(new Date('2026-02-11T00:01:02Z'));

        const res3 = await gateway.handleUpdateLocation(client, {
            ...baseDto,
            latitude: 5,
            longitude: 6,
        });

        expect(locationService.saveLocation).toHaveBeenCalledTimes(2);
        expect(res3).toEqual({
            event: 'location_saved',
            data: { success: true, persisted: true },
        });
    });

    it('rejects updates that are too frequent', async () => {
        const { gateway, locationService, server } = buildGateway();
        const client = {
            data: { user: { id: 2, email: 'fast@example.com', role: 'user' } },
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        const dto: UpdateLocationDto = {
            latitude: 10,
            longitude: 20,
            deviceTimestamp: new Date('2026-02-11T00:00:00Z').toISOString(),
        };

        (locationService.saveLocation as jest.Mock).mockResolvedValue({
            latitude: 10,
            longitude: 20,
            accuracy: null,
            speed: null,
            heading: null,
            altitude: null,
            deviceTimestamp: new Date(dto.deviceTimestamp),
            createdAt: new Date('2026-02-11T00:00:00Z'),
        });

        jest.setSystemTime(new Date('2026-02-11T00:00:00Z'));
        await gateway.handleUpdateLocation(client, dto);

        jest.setSystemTime(new Date('2026-02-11T00:00:00.500Z'));
        const res = await gateway.handleUpdateLocation(client, dto);

        expect(res).toEqual({
            event: 'error',
            data: { message: 'Çok sık konum gönderimi. Lütfen bekleyin.' },
        });
        expect(locationService.saveLocation).toHaveBeenCalledTimes(1);
        expect(server.emit).toHaveBeenCalledTimes(1);
    });

    it('rejects updates with invalid deviceTimestamp', async () => {
        const { gateway, locationService, server } = buildGateway();
        const client = {
            data: { user: { id: 3, email: 'time@example.com', role: 'user' } },
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        jest.setSystemTime(new Date('2026-02-11T00:00:00Z'));

        const res = await gateway.handleUpdateLocation(client, {
            latitude: 10,
            longitude: 20,
            deviceTimestamp: new Date('2026-02-10T23:00:00Z').toISOString(),
        });

        expect(res).toEqual({
            event: 'error',
            data: { message: 'Geçersiz cihaz zaman damgası.' },
        });
        expect(locationService.saveLocation).not.toHaveBeenCalled();
        expect(server.emit).not.toHaveBeenCalled();
        expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects after repeated violations', async () => {
        const originalMax = process.env.WS_RATE_LIMIT_MAX_VIOLATIONS;
        const originalWindow = process.env.WS_RATE_LIMIT_WINDOW_MS;
        process.env.WS_RATE_LIMIT_MAX_VIOLATIONS = '2';
        process.env.WS_RATE_LIMIT_WINDOW_MS = '30000';

        try {
            const { gateway, locationService } = buildGateway();
            const client = {
                data: { user: { id: 4, email: 'abuse@example.com', role: 'user' } },
                emit: jest.fn(),
                disconnect: jest.fn(),
            } as any;

            const dto: UpdateLocationDto = {
                latitude: 1,
                longitude: 2,
                deviceTimestamp: new Date('2026-02-11T00:00:00Z').toISOString(),
            };

            (locationService.saveLocation as jest.Mock).mockResolvedValue({
                latitude: 1,
                longitude: 2,
                accuracy: null,
                speed: null,
                heading: null,
                altitude: null,
                deviceTimestamp: new Date(dto.deviceTimestamp),
                createdAt: new Date('2026-02-11T00:00:00Z'),
            });

            jest.setSystemTime(new Date('2026-02-11T00:00:00Z'));
            await gateway.handleUpdateLocation(client, dto);

            jest.setSystemTime(new Date('2026-02-11T00:00:00.500Z'));
            await gateway.handleUpdateLocation(client, dto);

            jest.setSystemTime(new Date('2026-02-11T00:00:00.700Z'));
            const res = await gateway.handleUpdateLocation(client, dto);

            expect(res).toEqual({
                event: 'error',
                data: { message: 'Çok sık konum gönderimi. Bağlantı kapatıldı.' },
            });
            expect(client.emit).toHaveBeenCalledWith('error', {
                message: 'Çok fazla hatalı istek. Bağlantı kapatıldı.',
            });
            expect(client.disconnect).toHaveBeenCalled();
        } finally {
            process.env.WS_RATE_LIMIT_MAX_VIOLATIONS = originalMax;
            process.env.WS_RATE_LIMIT_WINDOW_MS = originalWindow;
        }
    });
});
