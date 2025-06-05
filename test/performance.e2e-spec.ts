import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabase } from './utils/test-database';

describe('Performance Tests (e2e)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let authToken: string;
  let testUserId: string;
  let testListId: string;

  beforeAll(async () => {
    // Setup test database
    await TestDatabase.resetDatabase();
    testDb = TestDatabase.getInstance();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and authenticate
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'perf-test@example.com',
        password: 'TestPassword123!',
        name: 'Performance Test User',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'perf-test@example.com',
        password: 'TestPassword123!',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;
    testUserId = registerResponse.body.user.id;

    // Create test list
    const listResponse = await request(app.getHttpServer())
      .post('/lists')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Performance Test List',
        description: 'List for performance testing',
      })
      .expect(201);

    testListId = listResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  describe('API Response Time Benchmarks', () => {
    it('should respond to auth login within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'perf-test@example.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to list creation within 150ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .post('/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Speed Test List',
          description: 'Testing response time',
        })
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(150);
    });

    it('should respond to task creation within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Speed Test Task',
          description: 'Testing task creation speed',
          listId: testListId,
        })
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to list retrieval within 50ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('Load Testing', () => {
    it('should handle 50 concurrent task creations', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Load Test Task ${i}`,
            description: `Task created during load test #${i}`,
            listId: testListId,
          })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successfulRequests = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalTime = endTime - startTime;

      expect(successfulRequests).toBeGreaterThanOrEqual(45); // 90% success rate
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds
    });

    it('should handle 100 concurrent list retrievals', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(app.getHttpServer())
          .get('/lists')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successfulRequests = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalTime = endTime - startTime;

      expect(successfulRequests).toBeGreaterThanOrEqual(95); // 95% success rate
      expect(totalTime).toBeLessThan(3000); // Complete within 3 seconds
    });

    it('should maintain performance with large dataset', async () => {
      // Create 500 tasks
      const taskPromises = Array.from({ length: 500 }, (_, i) =>
        request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Bulk Task ${i}`,
            description: `Bulk created task number ${i}`,
            listId: testListId,
          })
      );

      await Promise.all(taskPromises);

      // Test retrieval performance with large dataset
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .query({ listId: testListId, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
      expect(response.body.data).toHaveLength(100);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits during stress test', async () => {
      const initialMemory = process.memoryUsage();

      // Perform intensive operations
      const promises = Array.from({ length: 200 }, (_, i) =>
        request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Memory Test Task ${i}`,
            description: `Task for memory usage testing ${i}`.repeat(10),
            listId: testListId,
          })
      );

      await Promise.allSettled(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseInMB).toBeLessThan(100); // Should not increase by more than 100MB
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should apply rate limiting without significant performance impact', async () => {
      // Test normal rate within limits
      const normalRequests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get('/lists')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(normalRequests);
      const endTime = Date.now();

      const successfulRequests = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const averageResponseTime = (endTime - startTime) / successfulRequests;

      expect(successfulRequests).toBe(10);
      expect(averageResponseTime).toBeLessThan(20); // Average under 20ms per request
    });
  });

  describe('Database Query Performance', () => {
    it('should execute complex queries efficiently', async () => {
      // Create some test data first
      await Promise.all([
        request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Query Test Task 1',
            description: 'High priority task',
            listId: testListId,
            priority: 'HIGH',
          }),
        request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Query Test Task 2',
            description: 'Medium priority task',
            listId: testListId,
            priority: 'MEDIUM',
          }),
      ]);

      // Test complex query with filters and sorting
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .query({
          listId: testListId,
          priority: 'HIGH',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 50,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      const queryTime = endTime - startTime;
      expect(queryTime).toBeLessThan(100);
      expect(response.body.data).toBeDefined();
    });
  });
});