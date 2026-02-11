import {
    IsNumber,
    IsOptional,
    IsDateString,
    Min,
    Max,
} from 'class-validator';

export class UpdateLocationDto {
    @IsNumber({}, { message: 'latitude bir sayı olmalıdır.' })
    @Min(-90, { message: 'latitude -90 ile 90 arasında olmalıdır.' })
    @Max(90, { message: 'latitude -90 ile 90 arasında olmalıdır.' })
    latitude: number;

    @IsNumber({}, { message: 'longitude bir sayı olmalıdır.' })
    @Min(-180, { message: 'longitude -180 ile 180 arasında olmalıdır.' })
    @Max(180, { message: 'longitude -180 ile 180 arasında olmalıdır.' })
    longitude: number;

    @IsOptional()
    @IsNumber({}, { message: 'accuracy bir sayı olmalıdır.' })
    @Min(0, { message: 'accuracy 0 veya daha büyük olmalıdır.' })
    accuracy?: number;

    @IsOptional()
    @IsNumber({}, { message: 'speed bir sayı olmalıdır.' })
    @Min(0, { message: 'speed 0 veya daha büyük olmalıdır.' })
    speed?: number;

    @IsOptional()
    @IsNumber({}, { message: 'heading bir sayı olmalıdır.' })
    @Min(0, { message: 'heading 0-360 arasında olmalıdır.' })
    @Max(360, { message: 'heading 0-360 arasında olmalıdır.' })
    heading?: number;

    @IsOptional()
    @IsNumber({}, { message: 'altitude bir sayı olmalıdır.' })
    altitude?: number;

    @IsDateString({}, { message: 'deviceTimestamp geçerli bir ISO tarih olmalıdır.' })
    deviceTimestamp: string;
}
