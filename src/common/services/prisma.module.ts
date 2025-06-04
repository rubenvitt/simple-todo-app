import { Global, Module } from '@nestjs/common';
import { PerformanceController } from '../controllers/performance.controller';
import { PrismaService } from './prisma.service';
import { QueryPerformanceService } from './query-performance.service';

@Global()
@Module({
    providers: [PrismaService, QueryPerformanceService],
    controllers: [PerformanceController],
    exports: [PrismaService, QueryPerformanceService],
})
export class PrismaModule { } 