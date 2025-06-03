import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { WebSocketsGateway } from './websockets.gateway';

@Module({
    providers: [WebSocketsGateway, PrismaService],
    exports: [WebSocketsGateway],
})
export class WebSocketsModule { } 