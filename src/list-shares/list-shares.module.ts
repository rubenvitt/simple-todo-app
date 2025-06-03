import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { ListSharesController } from './list-shares.controller';
import { ListSharesService } from './list-shares.service';

@Module({
    controllers: [ListSharesController],
    providers: [ListSharesService, PrismaService],
    exports: [ListSharesService],
})
export class ListSharesModule { } 