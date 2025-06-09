import { Global, Module } from '@nestjs/common';
import { PerformanceController } from '../controllers/performance.controller';
import { DefaultListService } from './default-list.service';
import { PrismaService } from './prisma.service';
import { QueryPerformanceService } from './query-performance.service';

@Global()
@Module({
  providers: [PrismaService, QueryPerformanceService, DefaultListService],
  controllers: [PerformanceController],
  exports: [PrismaService, QueryPerformanceService, DefaultListService],
})
export class PrismaModule {}
