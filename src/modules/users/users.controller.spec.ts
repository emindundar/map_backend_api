import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

describe('UsersController', () => {
    let controller: UsersController;
    let usersService: UsersService;

    const usersServiceMock = {
        updateRole: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: usersServiceMock,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        usersService = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('updates user role via service', async () => {
        (usersService.updateRole as jest.Mock).mockResolvedValue({
            id: 10,
            email: 'user@example.com',
            role: UserRole.ADMIN,
        });

        const result = await controller.updateRole(10, {
            role: UserRole.ADMIN,
        });

        expect(usersService.updateRole).toHaveBeenCalledWith(10, UserRole.ADMIN);
        expect(result).toEqual({
            success: true,
            message: 'Kullanıcı rolü güncellendi.',
            user: {
                id: 10,
                email: 'user@example.com',
                role: UserRole.ADMIN,
            },
        });
    });
});
