import { Module } from '@nestjs/common';
import { ListAccessGuard, ListPermissionGuard } from '../common/guards';
import { PrismaService } from '../common/services/prisma.service';
import { ListSharesService } from '../list-shares/list-shares.service';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  controllers: [ListsController],
  providers: [
    ListsService,
    PrismaService,
    ListSharesService,
    ListAccessGuard,
    ListPermissionGuard
  ]
})
export class ListsModule {}
