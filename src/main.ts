import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers with Helmet - relaxed for development
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Added for Swagger UI
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"], // Allow connections to same origin
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
  }));

  // Enhanced CORS configuration - more permissive for development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development: More permissive CORS
    app.enableCors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Content-Length', 'Content-Type'],
    });
  } else {
    // Production: Strict CORS
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
  }

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enhanced global validation pipe
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

  // Swagger API Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Simple Todo App API')
    .setDescription('A comprehensive todo application API with real-time collaboration features, user authentication, and task management capabilities')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User registration, login, and profile management')
    .addTag('Tasks', 'Task management and CRUD operations')
    .addTag('Lists', 'Todo list management and organization')
    .addTag('Users', 'User profile and account management')
    .addTag('Invitations', 'List sharing and collaboration invitations')
    .addTag('List Shares', 'Shared list management and permissions')
    .addTag('Notifications', 'User notifications and alerts')
    .addTag('WebSocket', 'Real-time communication and updates')
    .addServer(process.env.API_URL || 'http://localhost:3000', 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Simple Todo App API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`📚 API Documentation available at: ${await app.getUrl()}/api/docs`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
