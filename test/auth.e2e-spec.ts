import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabase } from './utils/test-database';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let testDb: TestDatabase;

    beforeAll(async () => {
        // Ensure test environment variables are set before module creation
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_URL = 'postgresql://todo_user:todo_password@localhost:9001/todo_test';
        process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
        
        // Set very high rate limits for testing
        process.env.RATE_LIMIT_AUTH_MAX = '100000';
        process.env.RATE_LIMIT_AUTH_TTL = '3600000';
        process.env.RATE_LIMIT_API_MAX = '100000'; 
        process.env.RATE_LIMIT_MAX = '100000';
        
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Apply the same middleware as in main.ts
        const { ValidationPipe } = await import('@nestjs/common');
        const helmet = await import('helmet');
        const { AllExceptionsFilter } = await import('../src/common/filters/all-exceptions.filter');

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

        const { AppLoggerService } = await import('../src/common/services/logger.service');
        const loggerService = app.get(AppLoggerService);
        app.useGlobalFilters(new AllExceptionsFilter(loggerService));
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

        // Initialize test database
        testDb = TestDatabase.getInstance();
        await testDb.reset();
    });

    afterAll(async () => {
        await testDb.close();
        await app.close();
    });

    beforeEach(async () => {
        await testDb.reset();
    });

    describe('/auth/register (POST)', () => {
        it('should register a new user successfully', () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            return request(app.getHttpServer())
                .post('/auth/register')
                .send(registerDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('user');
                    expect(res.body).toHaveProperty('access_token');
                    expect(res.body).toHaveProperty('refresh_token');
                    expect(res.body.user.email).toBe(registerDto.email);
                    expect(res.body.user.name).toBe(registerDto.name);
                    expect(res.body.user).not.toHaveProperty('passwordHash');
                });
        });

        it('should reject invalid email format', () => {
            const invalidEmailDto = {
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User',
            };

            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidEmailDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain('email must be an email');
                });
        });

        it('should reject weak password', () => {
            const weakPasswordDto = {
                email: 'test@example.com',
                password: '123',
                name: 'Test User',
            };

            return request(app.getHttpServer())
                .post('/auth/register')
                .send(weakPasswordDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain('password must be longer than or equal to 8 characters');
                });
        });

        it('should reject duplicate email', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            // First registration should succeed
            await request(app.getHttpServer())
                .post('/auth/register')
                .send(registerDto)
                .expect(201);

            // Second registration with same email should fail
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(registerDto)
                .expect(409)
                .expect((res) => {
                    expect(res.body.message).toContain('User with this email already exists');
                });
        });

        it('should reject missing required fields', () => {
            const incompleteDto = {
                email: 'test@example.com',
                // missing password and name
            };

            return request(app.getHttpServer())
                .post('/auth/register')
                .send(incompleteDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain('password should not be empty');
                    expect(res.body.message).toContain('name should not be empty');
                });
        });
    });

    describe('/auth/login (POST)', () => {
        beforeEach(async () => {
            // Seed a user for login tests
            await testDb.seed();
        });

        it('should login with valid credentials', () => {
            const loginDto = {
                email: 'user1@example.com',
                password: 'password123',
            };

            return request(app.getHttpServer())
                .post('/auth/login')
                .send(loginDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('user');
                    expect(res.body).toHaveProperty('access_token');
                    expect(res.body).toHaveProperty('refresh_token');
                    expect(res.body.user.email).toBe(loginDto.email);
                    expect(res.body.user).not.toHaveProperty('passwordHash');
                });
        });

        it('should reject invalid email', () => {
            const invalidLoginDto = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };

            return request(app.getHttpServer())
                .post('/auth/login')
                .send(invalidLoginDto)
                .expect(401)
                .expect((res) => {
                    expect(res.body.message).toContain('Invalid credentials');
                });
        });

        it('should reject invalid password', () => {
            const invalidPasswordDto = {
                email: 'user1@example.com',
                password: 'wrongpassword',
            };

            return request(app.getHttpServer())
                .post('/auth/login')
                .send(invalidPasswordDto)
                .expect(401)
                .expect((res) => {
                    expect(res.body.message).toContain('Invalid credentials');
                });
        });

        it('should validate login input', () => {
            const incompleteLoginDto = {
                email: 'invalid-email',
                // missing password
            };

            return request(app.getHttpServer())
                .post('/auth/login')
                .send(incompleteLoginDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain('email must be an email');
                    expect(res.body.message).toContain('password should not be empty');
                });
        });
    });

    describe('/auth/refresh (POST)', () => {
        let refreshToken: string;

        beforeEach(async () => {
            await testDb.seed();

            // Login to get a refresh token
            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'user1@example.com',
                    password: 'password123',
                });

            refreshToken = loginResponse.body.refresh_token;
        });

        it('should refresh tokens with valid refresh token', () => {
            return request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('access_token');
                    expect(res.body).toHaveProperty('refresh_token');
                });
        });

        it('should reject invalid refresh token', () => {
            return request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401)
                .expect((res) => {
                    expect(res.body.message).toContain('Invalid refresh token');
                });
        });

        it('should reject missing refresh token', () => {
            return request(app.getHttpServer())
                .post('/auth/refresh')
                .send({})
                .expect(400);
        });
    });

    describe('/auth/profile (GET)', () => {
        let accessToken: string;

        beforeEach(async () => {
            await testDb.seed();

            // Login to get an access token
            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'user1@example.com',
                    password: 'password123',
                });

            accessToken = loginResponse.body.access_token;
        });

        it('should get user profile with valid token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body).toHaveProperty('email', 'user1@example.com');
                    expect(res.body).toHaveProperty('name', 'Test User 1');
                    expect(res.body).not.toHaveProperty('passwordHash');
                });
        });

        it('should reject request without token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .expect(401);
        });

        it('should reject request with invalid token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should reject request with malformed authorization header', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', 'InvalidFormat token')
                .expect(401);
        });
    });

    describe('Protected Routes Access', () => {
        let accessToken: string;

        beforeEach(async () => {
            await testDb.seed();

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'user1@example.com',
                    password: 'password123',
                });

            accessToken = loginResponse.body.access_token;
        });

        it('should access protected lists endpoint with valid token', () => {
            return request(app.getHttpServer())
                .get('/lists')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
        });

        it('should reject access to protected lists endpoint without token', () => {
            return request(app.getHttpServer())
                .get('/lists')
                .expect(401);
        });

        it('should access protected users endpoint with valid token', () => {
            return request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
        });

        it('should reject access to protected users endpoint without token', () => {
            return request(app.getHttpServer())
                .get('/users/profile')
                .expect(401);
        });
    });
}); 