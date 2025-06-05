import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '../users/guards/user-exists.guard';
import {
  CreateListShareDto,
  ListShareResponseDto,
  UpdateListShareDto,
} from './dto';
import { ListSharesService } from './list-shares.service';

@Controller('lists/:listId/shares')
@UseGuards(JwtAuthGuard, UserExistsGuard)
export class ListSharesController {
  constructor(private readonly listSharesService: ListSharesService) {}

  @Post()
  async shareList(
    @Request() req: any,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() createListShareDto: CreateListShareDto,
  ): Promise<ListShareResponseDto> {
    return this.listSharesService.shareList(
      req.user.id,
      listId,
      createListShareDto,
    );
  }

  @Get()
  async getListShares(
    @Request() req: any,
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<ListShareResponseDto[]> {
    return this.listSharesService.getListShares(req.user.id, listId);
  }

  @Put(':userId')
  async updateListShare(
    @Request() req: any,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() updateListShareDto: UpdateListShareDto,
  ): Promise<ListShareResponseDto> {
    return this.listSharesService.updateListShare(
      req.user.id,
      listId,
      targetUserId,
      updateListShareDto,
    );
  }

  @Delete(':userId')
  async removeListShare(
    @Request() req: any,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ): Promise<{ message: string }> {
    return this.listSharesService.removeListShare(
      req.user.id,
      listId,
      targetUserId,
    );
  }
}
