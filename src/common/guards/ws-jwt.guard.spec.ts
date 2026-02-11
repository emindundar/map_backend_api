import { WsJwtGuard } from './ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../modules/users/users.service';

describe('WsJwtGuard', () => {
    it('accepts auth.token and attaches user to socket', async () => {
        const jwtService = {
            verify: jest.fn().mockReturnValue({
                sub: 1,
                email: 'admin@example.com',
                role: 'admin',
            }),
        } as unknown as JwtService;

        const usersService = {
            findById: jest.fn().mockResolvedValue({ id: 1 }),
        } as unknown as UsersService;

        const guard = new WsJwtGuard(jwtService, usersService);

        const client = {
            id: 'socket-1',
            handshake: { auth: { token: 'Bearer valid-token' } },
            data: {},
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        const context = {
            switchToWs: () => ({
                getClient: () => client,
            }),
        } as any;

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
        expect(usersService.findById).toHaveBeenCalledWith(1);
        expect(client.data.user).toEqual({
            id: 1,
            email: 'admin@example.com',
            role: 'admin',
        });
    });

    it('rejects query token (auth.token required)', async () => {
        const jwtService = {
            verify: jest.fn(),
        } as unknown as JwtService;

        const usersService = {
            findById: jest.fn(),
        } as unknown as UsersService;

        const guard = new WsJwtGuard(jwtService, usersService);

        const client = {
            id: 'socket-2',
            handshake: { query: { token: 'Bearer bad-token' } },
            data: {},
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        const context = {
            switchToWs: () => ({
                getClient: () => client,
            }),
        } as any;

        const result = await guard.canActivate(context);

        expect(result).toBe(false);
        expect(jwtService.verify).not.toHaveBeenCalled();
        expect(client.emit).toHaveBeenCalledWith('error', {
            message: 'Yetkilendirme başarısız.',
        });
        expect(client.disconnect).toHaveBeenCalled();
    });
});
