import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(100)
    password!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(50)
    name!: string;
} 