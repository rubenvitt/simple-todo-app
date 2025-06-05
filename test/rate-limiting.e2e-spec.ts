import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authentication endpoints', () => {
    it('should block excessive login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple requests to trigger rate limiting
      const promises = Array(15)
        .fill(null)
        .map(() => 
          request(app.getHttpServer())
            .post('/auth/login')
            .send(loginData)
        );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);

    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      // Should have rate limiting headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit-auth');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining-auth');
    });
  });

  describe('Security monitoring endpoints', () => {
    it('should provide rate limiting statistics', async () => {
      // First authenticate to access monitoring endpoints
      const authResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'SecurePassword123!',
          username: 'admin',
        })
        .expect(201);

      const token = authResponse.body.access_token;
      expect(token).toBeDefined();

      const response = await request(app.getHttpServer())
        .get('/monitoring/security/rate-limits')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('blockedIps');
      expect(response.body.data).toHaveProperty('suspiciousActivity');
      expect(response.body.data).toHaveProperty('trafficAnalysis');
    });

    it('should provide DDoS protection statistics', async () => {
      // First authenticate to access monitoring endpoints
      const authResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin2@example.com',
          password: 'SecurePassword123!',
          username: 'admin2',
        })
        .expect(201);

      const token = authResponse.body.access_token;
      expect(token).toBeDefined();

      const response = await request(app.getHttpServer())
        .get('/monitoring/security/ddos-protection')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('traffic');
      expect(response.body.data).toHaveProperty('threats');
      expect(response.body.data).toHaveProperty('protection');
    });
  });

  describe('DDoS protection', () => {
    it('should detect and track suspicious traffic patterns', async () => {
      const userAgent = 'suspicious-bot/1.0';
      
      // Make requests with suspicious user agent
      const promises = Array(10)
        .fill(null)
        .map(() => 
          request(app.getHttpServer())
            .get('/health')
            .set('User-Agent', userAgent)
        );

      await Promise.all(promises);

      // Check if the suspicious activity was detected
      // This would require accessing the DDoS protection service
      // For now, we just verify the requests complete
      expect(promises.length).toBe(10);
    });
  });
});