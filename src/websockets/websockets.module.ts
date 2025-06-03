import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { WsJwtAuthGuard } from './guards';
import { WebSocketsGateway } from './websockets.gateway';

@Module({
    imports: [
        ConfigModule,
        JwtModule.register({}), // Will use global config from AuthModule
    ],
    providers: [WebSocketsGateway, PrismaService, TasksService, UsersService, WsJwtAuthGuard],
    exports: [WebSocketsGateway, WsJwtAuthGuard],
})
export class WebSocketsModule { } 