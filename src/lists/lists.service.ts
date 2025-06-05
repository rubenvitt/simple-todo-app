import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateListDto,
  ListResponseDto,
  PaginationDto,
  UpdateListDto,
} from './dto';

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  async createList(
    userId: string,
    createListDto: CreateListDto,
  ): Promise<ListResponseDto> {
    const list = await this.prisma.list.create({
      data: {
        name: createListDto.name,
        description: createListDto.description,
        color: createListDto.color || '#3B82F6', // Default blue color
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return list;
  }

  async getLists(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<{
    lists: ListResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Get both owned lists and shared lists
    const [lists, total] = await Promise.all([
      this.prisma.list.findMany({
        where: {
          OR: [
            { userId }, // Lists owned by user
            {
              shares: {
                some: {
                  userId, // Lists shared with user
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          shares: {
            where: { userId },
            select: {
              permissionLevel: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.list.count({
        where: {
          OR: [
            { userId },
            {
              shares: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
      }),
    ]);

    // Transform the response to include permission information
    const transformedLists = lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      color: list.color,
      userId: list.userId,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isOwner: list.userId === userId,
      permissionLevel:
        list.userId === userId
          ? 'OWNER'
          : list.shares[0]?.permissionLevel || null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      lists: transformedLists,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getListById(userId: string, listId: string): Promise<ListResponseDto> {
    const list = await this.prisma.list.findFirst({
      where: {
        id: listId,
        OR: [
          { userId }, // User owns the list
          {
            shares: {
              some: {
                userId, // User has shared access
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        shares: {
          where: { userId },
          select: {
            permissionLevel: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    // Transform response to include permission information
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: list.color,
      userId: list.userId,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isOwner: list.userId === userId,
      permissionLevel:
        list.userId === userId
          ? 'OWNER'
          : list.shares[0]?.permissionLevel || null,
    };
  }

  async updateList(
    userId: string,
    listId: string,
    updateListDto: UpdateListDto,
  ): Promise<ListResponseDto> {
    // First check if list exists and user owns it
    const existingList = await this.prisma.list.findFirst({
      where: {
        id: listId,
        userId,
      },
      select: { id: true },
    });

    if (!existingList) {
      throw new NotFoundException('List not found');
    }

    try {
      const updatedList = await this.prisma.list.update({
        where: { id: listId },
        data: updateListDto,
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedList;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('List not found');
      }
      throw error;
    }
  }

  async deleteList(
    userId: string,
    listId: string,
  ): Promise<{ message: string }> {
    // First check if list exists and user owns it
    const existingList = await this.prisma.list.findFirst({
      where: {
        id: listId,
        userId,
      },
      select: { id: true },
    });

    if (!existingList) {
      throw new NotFoundException('List not found');
    }

    try {
      // Use transaction to ensure proper cleanup
      await this.prisma.$transaction(async (tx) => {
        // Delete the list (cascade will handle tasks and shares)
        await tx.list.delete({
          where: { id: listId },
        });
      });

      return { message: 'List deleted successfully' };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('List not found');
      }
      throw error;
    }
  }

  async checkListOwnership(userId: string, listId: string): Promise<boolean> {
    const list = await this.prisma.list.findFirst({
      where: {
        id: listId,
        userId,
      },
      select: { id: true },
    });

    return !!list;
  }
}
