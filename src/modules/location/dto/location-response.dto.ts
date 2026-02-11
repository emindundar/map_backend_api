import { Expose } from 'class-transformer';

export class LocationResponseDto {
    @Expose()
    id: number;

    @Expose()
    userId: number;

    @Expose()
    latitude: number;

    @Expose()
    longitude: number;

    @Expose()
    accuracy: number;

    @Expose()
    speed: number;

    @Expose()
    heading: number;

    @Expose()
    altitude: number;

    @Expose()
    deviceTimestamp: Date;

    @Expose()
    createdAt: Date;
}

export class LocationHistoryQueryDto {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
