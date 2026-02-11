import {
    Injectable,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Location } from './entities/location.entity';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationHistoryQueryDto } from './dto/location-response.dto';

@Injectable()
export class LocationService {
    private readonly logger = new Logger(LocationService.name);

    constructor(
        @InjectRepository(Location)
        private readonly locationRepository: Repository<Location>,
    ) { }

    /**
     * Yeni konum kaydı oluştur
     */
    async saveLocation(
        userId: number,
        dto: UpdateLocationDto,
    ): Promise<Location> {
        try {
            const location = this.locationRepository.create({
                userId,
                latitude: dto.latitude,
                longitude: dto.longitude,
                accuracy: dto.accuracy,
                speed: dto.speed,
                heading: dto.heading,
                altitude: dto.altitude,
                deviceTimestamp: new Date(dto.deviceTimestamp),
            });

            const saved = await this.locationRepository.save(location);

            this.logger.debug(
                `Location saved: user=${userId}, lat=${dto.latitude}, lng=${dto.longitude}`,
            );

            return saved;
        } catch (error) {
            this.logger.error(
                `Error saving location: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Konum kaydedilirken hata oluştu.',
            );
        }
    }

    /**
     * Kullanıcının son konumunu getir
     */
    async getLastLocation(userId: number): Promise<Location | null> {
        try {
            return await this.locationRepository.findOne({
                where: { userId },
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            this.logger.error(
                `Error getting last location: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Son konum alınırken hata oluştu.',
            );
        }
    }

    /**
     * Kullanıcının konum geçmişini getir
     */
    async getLocationHistory(
        userId: number,
        query: LocationHistoryQueryDto,
    ): Promise<{ locations: Location[]; total: number }> {
        try {
            const where: any = { userId };

            if (query.startDate && query.endDate) {
                where.createdAt = Between(
                    new Date(query.startDate),
                    new Date(query.endDate),
                );
            } else if (query.startDate) {
                where.createdAt = MoreThanOrEqual(new Date(query.startDate));
            } else if (query.endDate) {
                where.createdAt = LessThanOrEqual(new Date(query.endDate));
            }

            const limit = query.limit || 100;
            const offset = query.offset || 0;

            const [locations, total] = await this.locationRepository.findAndCount({
                where,
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

            return { locations, total };
        } catch (error) {
            this.logger.error(
                `Error getting location history: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Konum geçmişi alınırken hata oluştu.',
            );
        }
    }
}
