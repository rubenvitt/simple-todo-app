import { Transform, plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
    Staging = 'staging',
}

class EnvironmentVariables {
    @IsEnum(Environment)
    @IsOptional()
    NODE_ENV: Environment = Environment.Development;

    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    PORT: number = 3000;

    @IsString()
    JWT_SECRET!: string;

    @IsString()
    @IsOptional()
    JWT_EXPIRES_IN: string = '15m';

    @IsString()
    @IsOptional()
    JWT_REFRESH_EXPIRES_IN: string = '7d';

    @IsString()
    DATABASE_URL!: string;

    @IsOptional()
    @IsString()
    DATABASE_POOL_SIZE?: string;

    @IsOptional()
    @IsString()
    DATABASE_CONNECTION_LIMIT?: string;

    @IsOptional()
    @IsString()
    FRONTEND_URL?: string;

    @IsOptional()
    @IsUrl()
    API_URL?: string;

    @IsOptional()
    @IsString()
    CORS_ORIGIN?: string;

    @IsOptional()
    @IsString()
    LOG_LEVEL?: string = 'info';

    @IsOptional()
    @IsString()
    LOG_FORMAT?: string = 'json';

    @IsOptional()
    @IsString()
    SENTRY_DSN?: string;

    @IsOptional()
    @IsString()
    REDIS_URL?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    RATE_LIMIT_TTL?: number = 60000;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    RATE_LIMIT_MAX?: number = 100;

    @IsOptional()
    @IsString()
    ENCRYPTION_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_ACCESS_KEY_ID?: string;

    @IsOptional()
    @IsString()
    AWS_SECRET_ACCESS_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_REGION?: string = 'us-east-1';

    @IsOptional()
    @IsString()
    SECRETS_MANAGER_REGION?: string;

    @IsOptional()
    @IsString()
    VAULT_URL?: string;

    @IsOptional()
    @IsString()
    VAULT_TOKEN?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const errorMessages = errors.map(error => {
            const constraints = Object.values(error.constraints || {});
            return `${error.property}: ${constraints.join(', ')}`;
        }).join('\n');

        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}

export const environmentConfig = () => ({
    environment: process.env.NODE_ENV || Environment.Development,
    port: parseInt(process.env.PORT || '3000', 10),

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    database: {
        url: process.env.DATABASE_URL,
        poolSize: process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE, 10) : 10,
        connectionLimit: process.env.DATABASE_CONNECTION_LIMIT ? parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10) : 100,
    },

    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
        credentials: true,
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
    },

    monitoring: {
        sentryDsn: process.env.SENTRY_DSN,
    },

    cache: {
        redisUrl: process.env.REDIS_URL,
    },

    rateLimit: {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },

    security: {
        encryptionKey: process.env.ENCRYPTION_KEY,
    },

    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        secretsManagerRegion: process.env.SECRETS_MANAGER_REGION,
    },

    vault: {
        url: process.env.VAULT_URL,
        token: process.env.VAULT_TOKEN,
    },
});

export type AppConfig = ReturnType<typeof environmentConfig>; 