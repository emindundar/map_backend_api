import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: Repository<User>;
    let jwtService: JwtService;

    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        jwtService = module.get<JwtService>(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should successfully register a new user', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            mockUserRepository.findOne.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({
                id: 1,
                email: registerDto.email,
                role: UserRole.USER,
            });
            mockUserRepository.save.mockResolvedValue({
                id: 1,
                email: registerDto.email,
                role: UserRole.USER,
                createdAt: new Date(),
            });

            const result = await service.register(registerDto);

            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('user');
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: registerDto.email },
            });
        });

        it('should throw ConflictException if email exists', async () => {
            const registerDto = {
                email: 'existing@example.com',
                password: 'password123',
            };

            mockUserRepository.findOne.mockResolvedValue({
                id: 1,
                email: registerDto.email,
            });

            await expect(service.register(registerDto)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('login', () => {
        it('should successfully login a user', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const hashedPassword = await bcrypt.hash(loginDto.password, 10);
            const user = {
                id: 1,
                email: loginDto.email,
                passwordHash: hashedPassword,
                role: UserRole.USER,
            };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockJwtService.sign.mockReturnValue('jwt-token');

            const result = await service.login(loginDto);

            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('token');
            expect(result.token).toBe('jwt-token');
        });

        it('should throw UnauthorizedException for invalid credentials', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.login(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
