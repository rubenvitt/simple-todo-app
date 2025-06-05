import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  QueryNotificationsDto,
  UpdateNotificationDto,
} from './dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    // Override userId from token for security
    createNotificationDto.userId = req.user.id;
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: any,
    @Query() queryDto: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.notificationsService.findAll(req.user.id, queryDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.update(
      id,
      req.user.id,
      updateNotificationDto,
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch(':id/unread')
  @HttpCode(HttpStatus.OK)
  async markAsUnread(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsUnread(id, req.user.id);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: any): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.notificationsService.remove(id, req.user.id);
  }
}
