import { Exclude, Expose } from 'class-transformer';
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
    success: boolean;
    message: string;
    token: string;
    user: AuthUserDto;
}

export class RegisterResponseDto {
    success: boolean;
    message: string;
    user: AuthUserDto;
}
