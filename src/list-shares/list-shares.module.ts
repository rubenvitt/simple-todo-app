import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { UsersModule } from '../users/users.module';
import { ListSharesController } from './list-shares.controller';
import { ListSharesService } from './list-shares.service';

@Module({
  imports: [UsersModule],
  controllers: [ListSharesController],
  providers: [ListSharesService, PrismaService],
  exports: [ListSharesService],
})
export class ListSharesModule {}
