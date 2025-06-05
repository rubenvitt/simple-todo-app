import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enhanced CORS configuration - more permissive for development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Enable compression for all responses
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: process.env.COMPRESSION_LEVEL
        ? parseInt(process.env.COMPRESSION_LEVEL)
        : 6,
      threshold: process.env.COMPRESSION_THRESHOLD
        ? parseInt(process.env.COMPRESSION_THRESHOLD)
        : 1024,
    }),
  );

  if (isDevelopment) {
    // Development: More permissive CORS
    app.enableCors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
      ],
      exposedHeaders: ['Content-Length', 'Content-Type'],
    });
  } else {
    // Production: Strict CORS
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
        : ['http://localhost:3000', 'http://localhost:3001'];

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Allow requests with no origin (mobile apps, curl, etc.) if explicitly enabled
        if (!origin) {
          const allowNoOrigin = process.env.CORS_ALLOW_NO_ORIGIN === 'true';
          return callback(null, allowNoOrigin);
        }

        // Check allowed origins list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Check if wildcards are allowed and match pattern
        if (process.env.CORS_ALLOW_PATTERNS === 'true') {
          const patterns = (process.env.CORS_PATTERNS || '')
            .split(',')
            .map((p) => p.trim());
          for (const pattern of patterns) {
            if (new RegExp(pattern).test(origin)) {
              return callback(null, true);
            }
          }
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      methods: process.env.CORS_METHODS
        ? process.env.CORS_METHODS.split(',').map((m) => m.trim())
        : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS
        ? process.env.CORS_ALLOWED_HEADERS.split(',').map((h) => h.trim())
        : ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: process.env.CORS_EXPOSED_HEADERS
        ? process.env.CORS_EXPOSED_HEADERS.split(',').map((h) => h.trim())
        : ['Content-Length', 'Content-Type'],
      maxAge: process.env.CORS_MAX_AGE
        ? parseInt(process.env.CORS_MAX_AGE)
        : 86400,
    });
  }

  // Security headers with Helmet - conditional CSP based on environment
  if (isDevelopment) {
    // Development: Relaxed CSP for Swagger UI functionality
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'http://localhost:3000'], // Explicitly allow localhost API calls
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      }),
    );
  } else {
    // Production: Strict security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      }),
    );
  }

  // Global exception filter is now registered in app.module.ts

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
    .setDescription(
      'A comprehensive todo application API with real-time collaboration features, user authentication, and task management capabilities',
    )
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
    .addTag(
      'Authentication',
      'User registration, login, and profile management',
    )
    .addTag('Tasks', 'Task management and CRUD operations')
    .addTag('Lists', 'Todo list management and organization')
    .addTag('Users', 'User profile and account management')
    .addTag('Invitations', 'List sharing and collaboration invitations')
    .addTag('List Shares', 'Shared list management and permissions')
    .addTag('Notifications', 'User notifications and alerts')
    .addTag('WebSocket', 'Real-time communication and updates')
    .addServer(
      process.env.API_URL || 'http://localhost:3000',
      'Development server',
    )
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

  // Get logger service for structured logging
  const logger = app.get(AppLoggerService);

  const appUrl = await app.getUrl();
  const environment = process.env.NODE_ENV || 'development';

  logger.log(`🚀 Application is running on: ${appUrl}`, {
    type: 'application_startup',
    port,
    url: appUrl,
    environment,
  });

  logger.log(`📚 API Documentation available at: ${appUrl}/api/docs`, {
    type: 'application_startup',
    docsUrl: `${appUrl}/api/docs`,
  });

  logger.log(`🌍 Environment: ${environment}`, {
    type: 'application_startup',
    environment,
  });

  if (isDevelopment) {
    logger.log(
      `🔓 CSP disabled for development - Swagger UI fully functional`,
      {
        type: 'application_startup',
        environment,
        cspDisabled: true,
      },
    );
  }

  logger.log(
    `🗜️ Compression enabled with level: ${process.env.COMPRESSION_LEVEL || 6}`,
    {
      type: 'application_startup',
      compressionLevel: process.env.COMPRESSION_LEVEL || 6,
      compressionThreshold: process.env.COMPRESSION_THRESHOLD || 1024,
    },
  );

  if (!isDevelopment) {
    logger.log(`🔒 Production CORS configuration active`, {
      type: 'application_startup',
      allowedOrigins:
        process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ||
        process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) ||
        [],
      allowNoOrigin: process.env.CORS_ALLOW_NO_ORIGIN === 'true',
      allowPatterns: process.env.CORS_ALLOW_PATTERNS === 'true',
    });
  }
}
bootstrap();
