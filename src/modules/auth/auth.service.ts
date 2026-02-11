import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { plainToInstance } from 'class-transformer';
import {
    AuthUserDto,
    LoginResponseDto,
    RegisterResponseDto,
} from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly SALT_ROUNDS = 10;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
        const { email, password } = registerDto;

        try {
            // Email kontrolü
            const existingUser = await this.userRepository.findOne({
                where: { email: email.toLowerCase().trim() },
            });

            if (existingUser) {
                throw new ConflictException('Bu email adresi zaten kullanılmaktadır.');
            }

            // Password hash
            const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

            // Kullanıcı oluştur
            const user = this.userRepository.create({
                email: email.toLowerCase().trim(),
                passwordHash,
                role: UserRole.USER,
            });

            const savedUser = await this.userRepository.save(user);

            // JWT token oluştur
            const payload: JwtPayload = {
                sub: savedUser.id,
                email: savedUser.email,
                role: savedUser.role,
            };

            const token = this.jwtService.sign(payload);

            this.logger.log(`New user registered: ${savedUser.email}`);

            const userDto = plainToInstance(AuthUserDto, savedUser, {
                excludeExtraneousValues: true,
            });

            return plainToInstance(
                RegisterResponseDto,
                {
                    success: true,
                    message: 'Kullanıcı başarıyla kaydedildi ve giriş yapıldı.',
                    token,
                    user: userDto,
                },
                { excludeExtraneousValues: true },
            );
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            this.logger.error(`Registration error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Kayıt sırasında bir hata oluştu.');
        }
    }

    async login(loginDto: LoginDto): Promise<LoginResponseDto> {
        const { email, password } = loginDto;

        try {
            // Kullanıcıyı bul
            const user = await this.userRepository.findOne({
                where: { email: email.toLowerCase().trim() },
            });

            if (!user) {
                throw new UnauthorizedException('Geçersiz email veya şifre.');
            }

            // Şifre kontrolü
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

            if (!isPasswordValid) {
                throw new UnauthorizedException('Geçersiz email veya şifre.');
            }

            // JWT token oluştur
            const payload: JwtPayload = {
                sub: user.id,
                email: user.email,
                role: user.role,
            };

            const token = this.jwtService.sign(payload);

            this.logger.log(`User logged in: ${user.email}`);

            const userDto = plainToInstance(AuthUserDto, user, {
                excludeExtraneousValues: true,
            });

            return plainToInstance(
                LoginResponseDto,
                {
                    success: true,
                    message: 'Giriş başarılı.',
                    token,
                    user: userDto,
                },
                { excludeExtraneousValues: true },
            );
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Login error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Giriş sırasında bir hata oluştu.');
        }
    }

    async validateUser(userId: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }
}
