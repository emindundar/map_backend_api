import { IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateRoleDto {
    @IsEnum(UserRole, { message: 'role geçerli bir değer olmalıdır.' })
    role: UserRole;
}
