import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/common/services/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { environmentConfig } from '../src/common/config/app.config';

describe('Simple Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://todo_user:todo_password@localhost:9001/todo_test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [environmentConfig],
        }),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user successfully', async () => {
    const registerDto = {
      email: 'testuser@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);

    console.log('Registration response status:', response.status);
    console.log('Registration response body:', response.body);
    console.log('Registration response text:', response.text);

    expect(response.status).toBe(201);
  }, 10000);
});