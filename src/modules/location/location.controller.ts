import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LocationHistoryQueryDto } from './dto/location-response.dto';

@Controller('location')
export class LocationController {
    constructor(private readonly locationService: LocationService) { }

    /**
     * GET /location/:userId/last
     * Kullanıcının son konumunu getir
     * Admin yetkisi gerekir
     */
    @Get(':userId/last')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async getLastLocation(
        @Param('userId', ParseIntPipe) userId: number,
    ) {
        const location = await this.locationService.getLastLocation(userId);

        if (!location) {
            return {
                success: false,
                message: 'Bu kullanıcı için konum kaydı bulunamadı.',
                location: null,
            };
        }

        return {
            success: true,
            message: 'Son konum getirildi.',
            location: {
                id: location.id,
                userId: location.userId,
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
                accuracy: location.accuracy ? Number(location.accuracy) : null,
                speed: location.speed ? Number(location.speed) : null,
                heading: location.heading ? Number(location.heading) : null,
                altitude: location.altitude ? Number(location.altitude) : null,
                deviceTimestamp: location.deviceTimestamp,
                createdAt: location.createdAt,
            },
        };
    }

    /**
     * GET /location/:userId/history
     * Kullanıcının konum geçmişini getir
     * Admin yetkisi gerekir
     */
    @Get(':userId/history')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async getLocationHistory(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() query: LocationHistoryQueryDto,
    ) {
        const { locations, total } =
            await this.locationService.getLocationHistory(userId, query);

        return {
            success: true,
            message: 'Konum geçmişi getirildi.',
            total,
            count: locations.length,
            locations: locations.map((loc) => ({
                id: loc.id,
                userId: loc.userId,
                latitude: Number(loc.latitude),
                longitude: Number(loc.longitude),
                accuracy: loc.accuracy ? Number(loc.accuracy) : null,
                speed: loc.speed ? Number(loc.speed) : null,
                heading: loc.heading ? Number(loc.heading) : null,
                altitude: loc.altitude ? Number(loc.altitude) : null,
                deviceTimestamp: loc.deviceTimestamp,
                createdAt: loc.createdAt,
            })),
        };
    }
}
