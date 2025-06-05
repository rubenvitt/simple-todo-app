import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { WsJwtAuthGuard } from './guards';
import { ConnectionManagerService } from './services/connection-manager.service';
import { EnhancedBroadcastService } from './services/enhanced-broadcast.service';
import { EnhancedPermissionService } from './services/enhanced-permission.service';
import { WebSocketsGateway } from './websockets.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}), // Will use global config from AuthModule
  ],
  providers: [
    WebSocketsGateway,
    PrismaService,
    TasksService,
    UsersService,
    WsJwtAuthGuard,
    ConnectionManagerService,
    EnhancedPermissionService,
    EnhancedBroadcastService,
  ],
  exports: [
    WebSocketsGateway,
    WsJwtAuthGuard,
    ConnectionManagerService,
    EnhancedPermissionService,
    EnhancedBroadcastService,
  ],
})
export class WebSocketsModule {}
