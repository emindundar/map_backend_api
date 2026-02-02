import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Geçerli bir email adresi giriniz.' })
    @IsNotEmpty({ message: 'Email alanı zorunludur.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Şifre alanı zorunludur.' })
    @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
    password: string;
}