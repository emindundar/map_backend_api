import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole } from '../../users/entities/user.entity';

export class AuthUserDto {
    @Expose()
    id: number;

    @Expose()
    email: string;

    @Expose()
    role: UserRole;

    @Expose()
    createdAt: Date;

    @Exclude()
    passwordHash: string;

    @Exclude()
    updatedAt: Date;
}

export class LoginResponseDto {
    @Expose()
    success: boolean;

    @Expose()
    message: string;

    @Expose()
    token: string;

    @Expose()
    @Type(() => AuthUserDto)
    user: AuthUserDto;
}

export class RegisterResponseDto {
    @Expose()
    success: boolean;

    @Expose()
    message: string;

    @Expose()
    token: string;

    @Expose()
    @Type(() => AuthUserDto)
    user: AuthUserDto;
}
