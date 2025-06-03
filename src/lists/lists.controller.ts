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
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionLevel } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireListPermission } from '../common/decorators';
import { ListAccessGuard, ListPermissionGuard } from '../common/guards';
import { CreateListDto, ListResponseDto, PaginationDto, UpdateListDto } from './dto';
import { ListsService } from './lists.service';

@ApiTags('Lists')
@Controller('lists')
@UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Post()
    @ApiOperation({
        summary: 'Create a new list',
        description: 'Create a new todo list. The authenticated user becomes the owner of the list.',
    })
    @ApiBody({
        type: CreateListDto,
        description: 'List creation data',
        examples: {
            example1: {
                summary: 'Basic list',
                value: {
                    name: 'Work Projects',
                    description: 'Tasks related to current work projects',
                    color: '#3B82F6',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'List created successfully',
        example: {
            id: 1,
            name: 'Work Projects',
            description: 'Tasks related to current work projects',
            color: '#3B82F6',
            ownerId: 1,
            isPublic: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            tasks: [],
            shares: [],
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
        example: {
            message: ['name must be a string'],
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    async createList(
        @Request() req: any,
        @Body() createListDto: CreateListDto,
    ): Promise<ListResponseDto> {
        return this.listsService.createList(req.user.id, createListDto);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all lists',
        description: 'Retrieve all lists accessible to the authenticated user (owned lists and shared lists)',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page',
        example: 10,
    })
    @ApiResponse({
        status: 200,
        description: 'Lists retrieved successfully',
        example: {
            lists: [
                {
                    id: 1,
                    name: 'Work Projects',
                    description: 'Tasks related to current work projects',
                    color: '#3B82F6',
                    ownerId: 1,
                    isPublic: false,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                    tasks: [],
                    shares: [],
                },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
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
    @ApiOperation({
        summary: 'Get list by ID',
        description: 'Retrieve a specific list by ID. User must have access to the list (owner or shared access).',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'List ID',
        example: '1',
    })
    @ApiResponse({
        status: 200,
        description: 'List retrieved successfully',
        example: {
            id: 1,
            name: 'Work Projects',
            description: 'Tasks related to current work projects',
            color: '#3B82F6',
            ownerId: 1,
            isPublic: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            tasks: [
                {
                    id: 1,
                    title: 'Complete project documentation',
                    description: 'Write comprehensive documentation for the API',
                    status: 'PENDING',
                    priority: 'HIGH',
                    dueDate: '2024-12-31T23:59:59.000Z',
                    assignedUserId: 1,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            ],
            shares: [],
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - No access to this list',
        example: {
            message: 'Access denied to this list',
            error: 'Forbidden',
            statusCode: 403,
        },
    })
    @ApiResponse({
        status: 404,
        description: 'List not found',
        example: {
            message: 'List not found',
            error: 'Not Found',
            statusCode: 404,
        },
    })
    async getListById(
        @Request() req: any,
        @Param('id') listId: string,
    ): Promise<ListResponseDto> {
        return this.listsService.getListById(req.user.id, listId);
    }

    @Put(':id')
    @UseGuards(ListPermissionGuard)
    @RequireListPermission(PermissionLevel.EDITOR)
    @ApiOperation({
        summary: 'Update a list',
        description: 'Update an existing list. Requires EDITOR or OWNER permission level.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'List ID',
        example: '1',
    })
    @ApiBody({
        type: UpdateListDto,
        description: 'List update data',
        examples: {
            example1: {
                summary: 'Update list details',
                value: {
                    name: 'Updated Work Projects',
                    description: 'Updated description for work projects',
                    color: '#10B981',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'List updated successfully',
        example: {
            id: 1,
            name: 'Updated Work Projects',
            description: 'Updated description for work projects',
            color: '#10B981',
            ownerId: 1,
            isPublic: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            tasks: [],
            shares: [],
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions (requires EDITOR or OWNER)',
        example: {
            message: 'Insufficient permissions. Required: EDITOR',
            error: 'Forbidden',
            statusCode: 403,
        },
    })
    @ApiResponse({
        status: 404,
        description: 'List not found',
    })
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
    @ApiOperation({
        summary: 'Delete a list',
        description: 'Delete an existing list. Requires OWNER permission level. This will also delete all associated tasks and shares.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'List ID',
        example: '1',
    })
    @ApiResponse({
        status: 200,
        description: 'List deleted successfully',
        example: {
            message: 'List deleted successfully',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions (requires OWNER)',
        example: {
            message: 'Insufficient permissions. Required: OWNER',
            error: 'Forbidden',
            statusCode: 403,
        },
    })
    @ApiResponse({
        status: 404,
        description: 'List not found',
        example: {
            message: 'List not found',
            error: 'Not Found',
            statusCode: 404,
        },
    })
    async deleteList(
        @Request() req: any,
        @Param('id') listId: string,
    ): Promise<{ message: string }> {
        return this.listsService.deleteList(req.user.id, listId);
    }
}
