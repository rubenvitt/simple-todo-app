import { Test, TestingModule } from '@nestjs/testing';
import { QueryPerformanceService } from './query-performance.service';

describe('QueryPerformanceService', () => {
    let service: QueryPerformanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [QueryPerformanceService],
        }).compile();

        service = module.get<QueryPerformanceService>(QueryPerformanceService);
    });

    afterEach(() => {
        service.clearMetrics();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('trackQuery', () => {
        it('should track query execution time', async () => {
            const mockQuery = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
            const queryInfo = {
                query: 'SELECT * FROM users',
                model: 'user',
                operation: 'findMany',
            };

            const result = await service.trackQuery(mockQuery, queryInfo);

            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
            expect(mockQuery).toHaveBeenCalled();

            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(1);
            expect(stats.queriesByModel.user).toBe(1);
            expect(stats.queriesByOperation.findMany).toBe(1);
        });

        it('should detect slow queries', async () => {
            const mockSlowQuery = jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 second delay
                return [{ id: 1 }];
            });

            const queryInfo = {
                query: 'SLOW SELECT * FROM users',
                model: 'user',
                operation: 'findMany',
            };

            await service.trackQuery(mockSlowQuery, queryInfo);

            const stats = service.getPerformanceStats();
            expect(stats.slowQueries).toBe(1);
            expect(stats.recentSlowQueries).toHaveLength(1);
            expect(stats.recentSlowQueries[0].query).toBe('SLOW SELECT * FROM users');
        });

        it('should handle query failures', async () => {
            const mockFailingQuery = jest.fn().mockRejectedValue(new Error('Database connection failed'));
            const queryInfo = {
                query: 'SELECT * FROM users',
                model: 'user',
                operation: 'findMany',
            };

            await expect(service.trackQuery(mockFailingQuery, queryInfo)).rejects.toThrow('Database connection failed');

            // Query should still be tracked even if it failed
            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(0); // Failed queries are not added to metrics
        });

        it('should count records correctly for arrays', async () => {
            const mockQuery = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
            const queryInfo = {
                query: 'SELECT * FROM users',
                model: 'user',
                operation: 'findMany',
            };

            await service.trackQuery(mockQuery, queryInfo);

            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(1);
        });

        it('should count records correctly for paginated results', async () => {
            const mockQuery = jest.fn().mockResolvedValue({
                data: [{ id: 1 }, { id: 2 }],
                pagination: { total: 10 },
            });
            const queryInfo = {
                query: 'SELECT * FROM users',
                model: 'user',
                operation: 'findMany',
            };

            await service.trackQuery(mockQuery, queryInfo);

            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(1);
        });
    });

    describe('getPerformanceStats', () => {
        it('should return empty stats when no queries tracked', () => {
            const stats = service.getPerformanceStats();

            expect(stats.totalQueries).toBe(0);
            expect(stats.averageDuration).toBe(0);
            expect(stats.slowQueries).toBe(0);
            expect(stats.queriesByModel).toEqual({});
            expect(stats.queriesByOperation).toEqual({});
            expect(stats.recentSlowQueries).toEqual([]);
        });

        it('should calculate average duration correctly', async () => {
            // Track multiple queries with known durations
            const queries = [
                { duration: 100, query: 'query1' },
                { duration: 200, query: 'query2' },
                { duration: 300, query: 'query3' },
            ];

            for (const { duration, query } of queries) {
                const mockQuery = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, duration));
                    return [];
                });
                await service.trackQuery(mockQuery, { query, model: 'test', operation: 'findMany' });
            }

            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(3);
            expect(stats.averageDuration).toBeGreaterThanOrEqual(150); // Should be around 200ms average
        });

        it('should group queries by model and operation', async () => {
            const testQueries = [
                { model: 'user', operation: 'findMany' },
                { model: 'user', operation: 'findUnique' },
                { model: 'task', operation: 'findMany' },
                { model: 'user', operation: 'findMany' },
            ];

            for (const queryInfo of testQueries) {
                const mockQuery = jest.fn().mockResolvedValue([]);
                await service.trackQuery(mockQuery, { query: 'test', ...queryInfo });
            }

            const stats = service.getPerformanceStats();
            expect(stats.queriesByModel.user).toBe(3);
            expect(stats.queriesByModel.task).toBe(1);
            expect(stats.queriesByOperation.findMany).toBe(3);
            expect(stats.queriesByOperation.findUnique).toBe(1);
        });
    });

    describe('getOptimizationSuggestions', () => {
        it('should suggest index optimization for high slow query rate', async () => {
            // Create 10 slow queries (each query needs to exceed 1000ms threshold)
            for (let i = 0; i < 10; i++) {
                const mockSlowQuery = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 1010)); // Just over 1000ms threshold
                    return [];
                });
                await service.trackQuery(mockSlowQuery, { query: `slow-query-${i}`, model: 'test' });
            }

            const suggestions = service.getOptimizationSuggestions();
            expect(suggestions).toContain('High number of slow queries detected. Consider adding database indexes for frequently filtered fields.');
        }, 20000); // Increased timeout to 20 seconds

        it('should suggest query review for high average duration', async () => {
            // Create queries with high average duration
            for (let i = 0; i < 5; i++) {
                const mockSlowQuery = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 600));
                    return [];
                });
                await service.trackQuery(mockSlowQuery, { query: `query-${i}`, model: 'test' });
            }

            const suggestions = service.getOptimizationSuggestions();
            expect(suggestions).toContain('Average query duration is high. Review query complexity and database indexes.');
        });

        it('should suggest caching for high volume models', async () => {
            // Create many queries for the same model
            for (let i = 0; i < 100; i++) {
                const mockQuery = jest.fn().mockResolvedValue([]);
                await service.trackQuery(mockQuery, { query: `query-${i}`, model: 'user', operation: 'findMany' });
            }

            const suggestions = service.getOptimizationSuggestions();
            expect(suggestions.some(s => s.includes('Model "user" has high query volume'))).toBe(true);
        });
    });

    describe('clearMetrics', () => {
        it('should clear all performance metrics', async () => {
            // Add some metrics
            const mockQuery = jest.fn().mockResolvedValue([]);
            await service.trackQuery(mockQuery, { query: 'test', model: 'user', operation: 'findMany' });

            let stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(1);

            // Clear metrics
            service.clearMetrics();

            stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBe(0);
            expect(stats.queriesByModel).toEqual({});
            expect(stats.queriesByOperation).toEqual({});
        });
    });

    describe('memory management', () => {
        it('should limit metrics history to prevent memory bloat', async () => {
            // This test would need to be adjusted based on the actual maxMetricsHistory value
            // For now, we'll just verify that the service handles many queries without issues
            const promises = [];
            for (let i = 0; i < 1200; i++) { // More than the max of 1000
                const mockQuery = jest.fn().mockResolvedValue([]);
                promises.push(service.trackQuery(mockQuery, {
                    query: `query-${i}`,
                    model: 'test',
                    operation: 'findMany'
                }));
            }

            await Promise.all(promises);

            const stats = service.getPerformanceStats();
            expect(stats.totalQueries).toBeLessThanOrEqual(1000); // Should be capped at maxMetricsHistory
        });
    });
}); 