import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
    controllers: [InvitationsController],
    providers: [InvitationsService, PrismaService],
    exports: [InvitationsService],
})
export class InvitationsModule { } 