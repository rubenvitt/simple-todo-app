import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Security Middleware (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Apply the same configuration as in main.ts
        const { ValidationPipe } = await import('@nestjs/common');
        const helmet = await import('helmet');
        const { AllExceptionsFilter } = await import('../src/common/filters/all-exceptions.filter');
        const { AppLoggerService } = await import('../src/common/services/logger.service');

        app.use(helmet.default({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
            crossOriginEmbedderPolicy: false,
        }));

        app.enableCors({
            origin: ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        });

        const logger = app.get(AppLoggerService);
        app.useGlobalFilters(new AllExceptionsFilter(logger));
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                validateCustomDecorators: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
            }),
        );

        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('Security Headers', () => {
        it('should set security headers', () => {
            return request(app.getHttpServer())
                .get('/')
                .expect((res) => {
                    expect(res.headers['x-frame-options']).toBeDefined();
                    expect(res.headers['x-content-type-options']).toBe('nosniff');
                    expect(res.headers['x-xss-protection']).toBeDefined();
                    expect(res.headers['content-security-policy']).toBeDefined();
                });
        });
    });

    describe('CORS Configuration', () => {
        it('should allow requests from allowed origins', () => {
            return request(app.getHttpServer())
                .options('/')
                .set('Origin', 'http://localhost:3000')
                .expect(204);
        });

        it('should include CORS headers in response', () => {
            return request(app.getHttpServer())
                .get('/')
                .set('Origin', 'http://localhost:3000')
                .expect((res) => {
                    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
                    expect(res.headers['access-control-allow-credentials']).toBe('true');
                });
        });
    });

    describe('Rate Limiting', () => {
        it('should allow requests within rate limits', async () => {
            // Make 10 requests (well within the 100/minute limit) 
            for (let i = 0; i < 10; i++) {
                const response = await request(app.getHttpServer())
                    .get('/');
                expect(response.status).not.toBe(429);
            }
        });

        it('should set rate limit headers', () => {
            return request(app.getHttpServer())
                .get('/')
                .expect((res) => {
                    expect(res.headers['x-ratelimit-limit']).toBeDefined();
                    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
                    expect(res.headers['x-ratelimit-reset']).toBeDefined();
                });
        });
    });

    describe('Input Validation', () => {
        it('should validate input with proper error format', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'invalid-email',
                    password: '123', // too short
                    name: '', // too short
                })
                .expect(400)
                .expect((res) => {
                    expect(res.body).toHaveProperty('statusCode', 400);
                    expect(res.body).toHaveProperty('timestamp');
                    expect(res.body).toHaveProperty('path');
                    expect(res.body).toHaveProperty('method');
                    expect(res.body).toHaveProperty('message');
                    expect(res.body).toHaveProperty('error');
                    expect(Array.isArray(res.body.message)).toBe(true);
                });
        });

        it('should reject requests with non-whitelisted properties', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User',
                    maliciousField: 'should be removed',
                })
                .expect(400);
        });
    });

    describe('Exception Filter', () => {
        it('should format errors consistently', () => {
            return request(app.getHttpServer())
                .get('/non-existent-route')
                .expect(404)
                .expect((res) => {
                    expect(res.body).toHaveProperty('statusCode', 404);
                    expect(res.body).toHaveProperty('timestamp');
                    expect(res.body).toHaveProperty('path', '/non-existent-route');
                    expect(res.body).toHaveProperty('method', 'GET');
                    expect(res.body).toHaveProperty('message');
                    expect(res.body).toHaveProperty('error');
                });
        });
    });
}); 