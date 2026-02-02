import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Geçerli bir email adresi giriniz.' })
    @IsNotEmpty({ message: 'Email alanı zorunludur.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Şifre alanı zorunludur.' })
    password: string;
}
