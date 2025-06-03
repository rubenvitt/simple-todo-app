import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PermissionLevel } from '../../../generated/prisma';

export class CreateInvitationDto {
    @IsEmail()
    inviteeEmail!: string;

    @IsEnum(PermissionLevel)
    @IsOptional()
    permissionLevel?: PermissionLevel = PermissionLevel.VIEWER;

    @IsString()
    @IsOptional()
    message?: string;
} 