import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Request,
    UseGuards
} from '@nestjs/common';
import { PermissionLevel } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireListPermission } from '../common/decorators';
import { ListAccessGuard, ListPermissionGuard } from '../common/guards';
import { CreateListDto, ListResponseDto, PaginationDto, UpdateListDto } from './dto';
import { ListsService } from './lists.service';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Post()
    async createList(
        @Request() req: any,
        @Body() createListDto: CreateListDto,
    ): Promise<ListResponseDto> {
        return this.listsService.createList(req.user.id, createListDto);
    }

    @Get()
    async getLists(
        @Request() req: any,
        @Query() paginationDto: PaginationDto,
    ): Promise<{
        lists: ListResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        return this.listsService.getLists(req.user.id, paginationDto);
    }

    @Get(':id')
    @UseGuards(ListAccessGuard)
    async getListById(
        @Request() req: any,
        @Param('id') listId: string,
    ): Promise<ListResponseDto> {
        return this.listsService.getListById(req.user.id, listId);
    }

    @Put(':id')
    @UseGuards(ListPermissionGuard)
    @RequireListPermission(PermissionLevel.EDITOR)
    async updateList(
        @Request() req: any,
        @Param('id') listId: string,
        @Body() updateListDto: UpdateListDto,
    ): Promise<ListResponseDto> {
        return this.listsService.updateList(req.user.id, listId, updateListDto);
    }

    @Delete(':id')
    @UseGuards(ListPermissionGuard)
    @RequireListPermission(PermissionLevel.OWNER)
    async deleteList(
        @Request() req: any,
        @Param('id') listId: string,
    ): Promise<{ message: string }> {
        return this.listsService.deleteList(req.user.id, listId);
    }
}
