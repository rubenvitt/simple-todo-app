import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/services/prisma.service';
import { CreateListDto, PaginationDto, UpdateListDto } from './dto';
import { ListsService } from './lists.service';

describe('ListsService', () => {
  let service: ListsService;
  let prismaService: any;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockList = {
    id: 'test-list-id',
    name: 'Test List',
    description: 'Test list description',
    color: '#3B82F6',
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      list: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createList', () => {
    const createListDto: CreateListDto = {
      name: 'New List',
      description: 'New list description',
      color: '#FF5733',
    };

    it('should create a list successfully', async () => {
      const expectedList = {
        ...mockList,
        name: createListDto.name,
        description: createListDto.description,
        color: createListDto.color,
      };

      prismaService.list.create.mockResolvedValue(expectedList);

      const result = await service.createList(mockUser.id, createListDto);

      expect(prismaService.list.create).toHaveBeenCalledWith({
        data: {
          name: createListDto.name,
          description: createListDto.description,
          color: createListDto.color,
          userId: mockUser.id,
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
      expect(result).toEqual(expectedList);
    });

    it('should create a list with default color when color not provided', async () => {
      const createListDtoWithoutColor = {
        name: 'New List',
        description: 'New list description',
      };

      const expectedList = {
        ...mockList,
        name: createListDtoWithoutColor.name,
        description: createListDtoWithoutColor.description,
        color: '#3B82F6',
      };

      prismaService.list.create.mockResolvedValue(expectedList);

      const result = await service.createList(mockUser.id, createListDtoWithoutColor);

      expect(prismaService.list.create).toHaveBeenCalledWith({
        data: {
          name: createListDtoWithoutColor.name,
          description: createListDtoWithoutColor.description,
          color: '#3B82F6',
          userId: mockUser.id,
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
      expect(result).toEqual(expectedList);
    });
  });

  describe('getLists', () => {
    const paginationDto: PaginationDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated lists for user', async () => {
      const mockLists = [
        {
          ...mockList,
          shares: [],
        },
        {
          ...mockList,
          id: 'test-list-2',
          name: 'Shared List',
          userId: 'other-user-id',
          shares: [{ permissionLevel: 'EDITOR' }],
        },
      ];

      prismaService.list.findMany.mockResolvedValue(mockLists);
      prismaService.list.count.mockResolvedValue(2);

      const result = await service.getLists(mockUser.id, paginationDto);

      expect(prismaService.list.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: mockUser.id },
            {
              shares: {
                some: {
                  userId: mockUser.id,
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
            where: { userId: mockUser.id },
            select: {
              permissionLevel: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(result).toEqual({
        lists: [
          {
            ...mockList,
            isOwner: true,
            permissionLevel: 'OWNER',
          },
          {
            ...mockList,
            id: 'test-list-2',
            name: 'Shared List',
            userId: 'other-user-id',
            isOwner: false,
            permissionLevel: 'EDITOR',
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const paginationWithPage2 = { page: 2, limit: 5 };

      prismaService.list.findMany.mockResolvedValue([]);
      prismaService.list.count.mockResolvedValue(7);

      const result = await service.getLists(mockUser.id, paginationWithPage2);

      expect(prismaService.list.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (2-1) * 5
          take: 5,
        })
      );

      expect(result.totalPages).toBe(2); // Math.ceil(7/5)
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  describe('getListById', () => {
    it('should return list by id for owner', async () => {
      const listWithShares = {
        ...mockList,
        shares: [],
      };

      prismaService.list.findFirst.mockResolvedValue(listWithShares);

      const result = await service.getListById(mockUser.id, mockList.id);

      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockList.id,
          OR: [
            { userId: mockUser.id },
            {
              shares: {
                some: {
                  userId: mockUser.id,
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
            where: { userId: mockUser.id },
            select: {
              permissionLevel: true,
            },
          },
        },
      });

      expect(result).toEqual({
        ...mockList,
        isOwner: true,
        permissionLevel: 'OWNER',
      });
    });

    it('should return list by id for shared user', async () => {
      const sharedList = {
        ...mockList,
        userId: 'other-user-id',
        shares: [{ permissionLevel: 'VIEWER' }],
      };

      prismaService.list.findFirst.mockResolvedValue(sharedList);

      const result = await service.getListById(mockUser.id, mockList.id);

      expect(result).toEqual({
        ...mockList,
        userId: 'other-user-id',
        isOwner: false,
        permissionLevel: 'VIEWER',
      });
    });

    it('should throw NotFoundException when list not found', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.getListById(mockUser.id, 'non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateList', () => {
    const updateListDto: UpdateListDto = {
      name: 'Updated List',
      description: 'Updated description',
    };

    it('should update list successfully', async () => {
      const updatedList = {
        ...mockList,
        ...updateListDto,
      };

      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.list.update.mockResolvedValue(updatedList);

      const result = await service.updateList(mockUser.id, mockList.id, updateListDto);

      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockList.id,
          userId: mockUser.id,
        },
        select: { id: true },
      });

      expect(prismaService.list.update).toHaveBeenCalledWith({
        where: { id: mockList.id },
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

      expect(result).toEqual(updatedList);
    });

    it('should throw NotFoundException when list not found or not owned', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.updateList(mockUser.id, 'non-existent-id', updateListDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle Prisma P2025 error', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.list.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateList(mockUser.id, mockList.id, updateListDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteList', () => {
    it('should delete list successfully', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.$transaction.mockImplementation((callback: any) => callback({
        list: {
          delete: jest.fn().mockResolvedValue(mockList),
        },
      }));

      const result = await service.deleteList(mockUser.id, mockList.id);

      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockList.id,
          userId: mockUser.id,
        },
        select: { id: true },
      });

      expect(result).toEqual({ message: 'List deleted successfully' });
    });

    it('should throw NotFoundException when list not found or not owned', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteList(mockUser.id, 'non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkListOwnership', () => {
    it('should return true when user owns the list', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);

      const result = await service.checkListOwnership(mockUser.id, mockList.id);

      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockList.id,
          userId: mockUser.id,
        },
        select: { id: true },
      });

      expect(result).toBe(true);
    });

    it('should return false when user does not own the list', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      const result = await service.checkListOwnership(mockUser.id, 'other-list-id');

      expect(result).toBe(false);
    });
  });
});
