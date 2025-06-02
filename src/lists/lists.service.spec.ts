import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/services/prisma.service';
import { CreateListDto, UpdateListDto } from './dto';
import { ListsService } from './lists.service';

describe('ListsService', () => {
  let service: ListsService;
  let prismaService: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockListId = '456e7890-e89b-12d3-a456-426614174000';

  const mockList = {
    id: mockListId,
    name: 'Test List',
    description: 'Test Description',
    color: '#3B82F6',
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse = {
    id: mockList.id,
    name: mockList.name,
    description: mockList.description,
    color: mockList.color,
    userId: mockList.userId,
    createdAt: mockList.createdAt,
    updatedAt: mockList.updatedAt,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      list: {
        create: jest.fn() as jest.MockedFunction<any>,
        findMany: jest.fn() as jest.MockedFunction<any>,
        findFirst: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        delete: jest.fn() as jest.MockedFunction<any>,
        count: jest.fn() as jest.MockedFunction<any>,
      },
      $transaction: jest.fn() as jest.MockedFunction<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createList', () => {
    const createListDto: CreateListDto = {
      name: 'Test List',
      description: 'Test Description',
      color: '#FF0000',
    };

    it('should create a list successfully', async () => {
      prismaService.list.create.mockResolvedValue(mockListResponse);

      const result = await service.createList(mockUserId, createListDto);

      expect(result).toEqual(mockListResponse);
      expect(prismaService.list.create).toHaveBeenCalledWith({
        data: {
          name: createListDto.name,
          description: createListDto.description,
          color: createListDto.color,
          userId: mockUserId,
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
    });

    it('should create a list with default color when not provided', async () => {
      const createListDtoWithoutColor = {
        name: 'Test List',
        description: 'Test Description',
      };
      prismaService.list.create.mockResolvedValue(mockListResponse);

      await service.createList(mockUserId, createListDtoWithoutColor);

      expect(prismaService.list.create).toHaveBeenCalledWith({
        data: {
          name: createListDtoWithoutColor.name,
          description: createListDtoWithoutColor.description,
          color: '#3B82F6',
          userId: mockUserId,
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
    });
  });

  describe('getLists', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should get paginated lists successfully', async () => {
      const mockLists = [mockListResponse];
      const mockTotal = 1;

      prismaService.list.findMany.mockResolvedValue(mockLists);
      prismaService.list.count.mockResolvedValue(mockTotal);

      const result = await service.getLists(mockUserId, paginationDto);

      expect(result).toEqual({
        lists: mockLists,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(prismaService.list.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(prismaService.list.count).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should calculate pagination correctly', async () => {
      const paginationDto = { page: 2, limit: 5 };
      prismaService.list.findMany.mockResolvedValue([]);
      prismaService.list.count.mockResolvedValue(12);

      const result = await service.getLists(mockUserId, paginationDto);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(prismaService.list.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });
  });

  describe('getListById', () => {
    it('should get list by id successfully', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockListResponse);

      const result = await service.getListById(mockUserId, mockListId);

      expect(result).toEqual(mockListResponse);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockListId,
          userId: mockUserId,
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
    });

    it('should throw NotFoundException when list not found', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.getListById(mockUserId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateList', () => {
    const updateListDto: UpdateListDto = {
      name: 'Updated List',
      description: 'Updated Description',
      color: '#00FF00',
    };

    it('should update list successfully', async () => {
      prismaService.list.findFirst.mockResolvedValue({ id: mockListId });
      prismaService.list.update.mockResolvedValue({
        ...mockListResponse,
        ...updateListDto,
      });

      const result = await service.updateList(mockUserId, mockListId, updateListDto);

      expect(result).toEqual({ ...mockListResponse, ...updateListDto });
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: mockListId, userId: mockUserId },
        select: { id: true },
      });
      expect(prismaService.list.update).toHaveBeenCalledWith({
        where: { id: mockListId },
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
    });

    it('should throw NotFoundException when list not found', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.updateList(mockUserId, 'nonexistent', updateListDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when update fails with P2025', async () => {
      prismaService.list.findFirst.mockResolvedValue({ id: mockListId });
      prismaService.list.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateList(mockUserId, mockListId, updateListDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteList', () => {
    it('should delete list successfully', async () => {
      prismaService.list.findFirst.mockResolvedValue({ id: mockListId });
      prismaService.$transaction.mockImplementation((callback: any) =>
        callback({ list: { delete: jest.fn().mockResolvedValue(mockList) } }),
      );

      const result = await service.deleteList(mockUserId, mockListId);

      expect(result).toEqual({ message: 'List deleted successfully' });
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: mockListId, userId: mockUserId },
        select: { id: true },
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when list not found', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteList(mockUserId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when delete fails with P2025', async () => {
      prismaService.list.findFirst.mockResolvedValue({ id: mockListId });
      prismaService.$transaction.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.deleteList(mockUserId, mockListId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkListOwnership', () => {
    it('should return true when user owns the list', async () => {
      prismaService.list.findFirst.mockResolvedValue({ id: mockListId });

      const result = await service.checkListOwnership(mockUserId, mockListId);

      expect(result).toBe(true);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: mockListId, userId: mockUserId },
        select: { id: true },
      });
    });

    it('should return false when user does not own the list', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      const result = await service.checkListOwnership(mockUserId, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
