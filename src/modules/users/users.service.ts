import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { plainToClass } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * ID'ye göre kullanıcı bul
     */
    async findById(id: number): Promise<User | null> {
        try {
            return await this.userRepository.findOne({ where: { id } });
        } catch (error) {
            this.logger.error(`Error finding user by id: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Kullanıcı arama sırasında hata oluştu.');
        }
    }

    /**
     * Email'e göre kullanıcı bul
     */
    async findByEmail(email: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { email: email.toLowerCase().trim() },
            });
        } catch (error) {
            this.logger.error(`Error finding user by email: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Kullanıcı arama sırasında hata oluştu.');
        }
    }

    /**
     * Takip edilebilir kullanıcıları getir (sadece USER rolündekiler)
     * Admin yetkisi gerekir
     */
    async getTrackableUsers(): Promise<UserResponseDto[]> {
        try {
            const users = await this.userRepository.find({
                where: { role: UserRole.USER },
                order: { createdAt: 'DESC' },
                select: ['id', 'email', 'role', 'createdAt'], // Sadece gerekli alanlar
            });

            this.logger.log(`Retrieved ${users.length} trackable users`);

            return users.map((user) =>
                plainToClass(UserResponseDto, user, {
                    excludeExtraneousValues: true,
                }),
            );
        } catch (error) {
            this.logger.error(
                `Error getting trackable users: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Kullanıcılar listelenirken hata oluştu.',
            );
        }
    }

    /**
     * Tüm kullanıcıları getir (Admin yetkisi gerekir)
     */
    async findAll(): Promise<UserResponseDto[]> {
        try {
            const users = await this.userRepository.find({
                order: { createdAt: 'DESC' },
                select: ['id', 'email', 'role', 'createdAt'],
            });

            return users.map((user) =>
                plainToClass(UserResponseDto, user, {
                    excludeExtraneousValues: true,
                }),
            );
        } catch (error) {
            this.logger.error(`Error finding all users: ${error.message}`, error.stack);
            throw new InternalServerErrorException(
                'Kullanıcılar listelenirken hata oluştu.',
            );
        }
    }

    /**
     * Kullanıcı sayısını getir
     */
    async count(): Promise<number> {
        try {
            return await this.userRepository.count();
        } catch (error) {
            this.logger.error(`Error counting users: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Kullanıcı sayımı sırasında hata oluştu.');
        }
    }

    /**
     * Role'e göre kullanıcı sayısını getir
     */
    async countByRole(role: UserRole): Promise<number> {
        try {
            return await this.userRepository.count({ where: { role } });
        } catch (error) {
            this.logger.error(
                `Error counting users by role: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Kullanıcı sayımı sırasında hata oluştu.');
        }
    }

    /**
     * Kullanıcı rolünü güncelle (Admin yetkisi gerekir)
     */
    async updateRole(id: number, role: UserRole): Promise<UserResponseDto> {
        try {
            const user = await this.findById(id);

            if (!user) {
                throw new NotFoundException('Kullanıcı bulunamadı.');
            }

            user.role = role;
            const updatedUser = await this.userRepository.save(user);

            this.logger.log(`User role updated: ${user.email} -> ${role}`);

            return plainToClass(UserResponseDto, updatedUser, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error updating user role: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Rol güncelleme sırasında hata oluştu.');
        }
    }

    /**
     * Kullanıcıyı sil (Admin yetkisi gerekir)
     */
    async remove(id: number): Promise<void> {
        try {
            const user = await this.findById(id);

            if (!user) {
                throw new NotFoundException('Kullanıcı bulunamadı.');
            }

            await this.userRepository.remove(user);

            this.logger.log(`User deleted: ${user.email}`);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error deleting user: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Kullanıcı silme sırasında hata oluştu.');
        }
    }
}
