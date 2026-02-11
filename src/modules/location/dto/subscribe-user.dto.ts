import { IsNumber, IsPositive } from 'class-validator';

export class SubscribeUserDto {
    @IsNumber({}, { message: 'userId bir sayı olmalıdır.' })
    @IsPositive({ message: 'userId pozitif bir sayı olmalıdır.' })
    userId: number;
}
