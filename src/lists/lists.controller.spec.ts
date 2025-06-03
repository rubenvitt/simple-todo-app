import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListAccessGuard, ListPermissionGuard } from '../common/guards';
import { CreateListDto, UpdateListDto } from './dto';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

describe('ListsController', () => {
  let controller: ListsController;
  let listsService: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockListId = '456e7890-e89b-12d3-a456-426614174000';

  const mockRequest = {
    user: { id: mockUserId },
  };

  const mockListResponse = {
    id: mockListId,
    name: 'Test List',
    description: 'Test Description',
    color: '#3B82F6',
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    lists: [mockListResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockListsService = {
      createList: jest.fn(),
      getLists: jest.fn(),
      getListById: jest.fn(),
      updateList: jest.fn(),
      deleteList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListsController],
      providers: [
        { provide: ListsService, useValue: mockListsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ListAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ListPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ListsController>(ListsController);
    listsService = module.get(ListsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createList', () => {
    const createListDto: CreateListDto = {
      name: 'Test List',
      description: 'Test Description',
      color: '#FF0000',
    };

    it('should create a list successfully', async () => {
      listsService.createList.mockResolvedValue(mockListResponse);

      const result = await controller.createList(mockRequest, createListDto);

      expect(result).toEqual(mockListResponse);
      expect(listsService.createList).toHaveBeenCalledWith(
        mockUserId,
        createListDto,
      );
    });
  });

  describe('getLists', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should get paginated lists successfully', async () => {
      listsService.getLists.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getLists(mockRequest, paginationDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(listsService.getLists).toHaveBeenCalledWith(
        mockUserId,
        paginationDto,
      );
    });
  });

  describe('getListById', () => {
    it('should get list by id successfully', async () => {
      listsService.getListById.mockResolvedValue(mockListResponse);

      const result = await controller.getListById(mockRequest, mockListId);

      expect(result).toEqual(mockListResponse);
      expect(listsService.getListById).toHaveBeenCalledWith(
        mockUserId,
        mockListId,
      );
    });
  });

  describe('updateList', () => {
    const updateListDto: UpdateListDto = {
      name: 'Updated List',
      description: 'Updated Description',
      color: '#00FF00',
    };

    it('should update list successfully', async () => {
      const updatedListResponse = { ...mockListResponse, ...updateListDto };
      listsService.updateList.mockResolvedValue(updatedListResponse);

      const result = await controller.updateList(
        mockRequest,
        mockListId,
        updateListDto,
      );

      expect(result).toEqual(updatedListResponse);
      expect(listsService.updateList).toHaveBeenCalledWith(
        mockUserId,
        mockListId,
        updateListDto,
      );
    });
  });

  describe('deleteList', () => {
    it('should delete list successfully', async () => {
      const deleteResponse = { message: 'List deleted successfully' };
      listsService.deleteList.mockResolvedValue(deleteResponse);

      const result = await controller.deleteList(mockRequest, mockListId);

      expect(result).toEqual(deleteResponse);
      expect(listsService.deleteList).toHaveBeenCalledWith(
        mockUserId,
        mockListId,
      );
    });
  });
});
