import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { UserExistsGuard } from './guards';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserExistsGuard, PrismaService],
  exports: [UsersService, UserExistsGuard],
})
export class UsersModule {}
