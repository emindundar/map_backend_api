import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsOptional } from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment = Environment.Development;

    @IsNumber()
    PORT: number = 3000;

    @IsString()
    DB_HOST: string;

    @IsNumber()
    DB_PORT: number = 5432;

    @IsString()
    DB_USERNAME: string;

    @IsString()
    DB_PASSWORD: string;

    @IsString()
    DB_DATABASE: string;

    @IsString()
    JWT_SECRET: string;

    @IsString()
    @IsOptional()
    JWT_EXPIRES_IN?: string = '24h';

    @IsNumber()
    @IsOptional()
    THROTTLE_TTL?: number = 60;

    @IsNumber()
    @IsOptional()
    THROTTLE_LIMIT?: number = 10;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        console.error('❌ Environment validation failed:');
        errors.forEach((error) => {
            console.error(`  - ${error.property}: ${Object.values(error.constraints || {}).join(', ')}`);
        });
        throw new Error('Invalid environment variables');
    }

    return validatedConfig;
}
