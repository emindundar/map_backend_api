import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { LocationGateway } from './location.gateway';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Location]),
        AuthModule,
        UsersModule,
    ],
    controllers: [LocationController],
    providers: [LocationGateway, LocationService],
    exports: [LocationService],
})
export class LocationModule { }
