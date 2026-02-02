import {
    Controller,
    Get,
    Delete,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { TrackableUsersResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * GET /users/trackable
     * Takip edilebilir kullanıcıları getir (sadece USER rolü)
     * Admin yetkisi gerekir
     */
    @Get('trackable')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async getTrackableUsers(): Promise<TrackableUsersResponseDto> {
        const users = await this.usersService.getTrackableUsers();

        return {
            success: true,
            message: 'Takip edilebilir kullanıcılar listelendi.',
            count: users.length,
            users,
        };
    }

    /**
     * GET /users
     * Tüm kullanıcıları getir
     * Admin yetkisi gerekir
     */
    @Get()
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async findAll() {
        const users = await this.usersService.findAll();

        return {
            success: true,
            message: 'Kullanıcılar listelendi.',
            count: users.length,
            users,
        };
    }

    /**
     * GET /users/:id
     * ID'ye göre kullanıcı getir
     * Admin yetkisi gerekir
     */
    @Get(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const user = await this.usersService.findById(id);

        if (!user) {
            return {
                success: false,
                message: 'Kullanıcı bulunamadı.',
            };
        }

        return {
            success: true,
            message: 'Kullanıcı bulundu.',
            user,
        };
    }

    /**
     * DELETE /users/:id
     * Kullanıcı sil
     * Admin yetkisi gerekir
     */
    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.usersService.remove(id);

        return {
            success: true,
            message: 'Kullanıcı başarıyla silindi.',
        };
    }

    /**
     * GET /users/stats/count
     * Kullanıcı istatistikleri
     * Admin yetkisi gerekir
     */
    @Get('stats/count')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async getStats() {
        const totalUsers = await this.usersService.count();
        const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
        const userCount = await this.usersService.countByRole(UserRole.USER);

        return {
            success: true,
            message: 'Kullanıcı istatistikleri getirildi.',
            stats: {
                total: totalUsers,
                admins: adminCount,
                users: userCount,
            },
        };
    }
}
