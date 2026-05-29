import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Health check endpoint for Docker healthcheck and monitoring.
 * Returns DB + Redis ping status.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis(
      this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
  }

  /**
   * GET /api/health
   * Returns the status of the database and Redis connections.
   */
  @Get()
  @ApiOperation({ summary: 'Health check — DB + Redis ping' })
  async check(): Promise<{
    status: string;
    info: {
      database: { status: string };
      redis: { status: string };
    };
  }> {
    let dbStatus = 'up';
    let redisStatus = 'up';

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      dbStatus = 'down';
    }

    // Check Redis
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        redisStatus = 'down';
      }
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      redisStatus = 'down';
    }

    const overallStatus =
      dbStatus === 'up' && redisStatus === 'up' ? 'ok' : 'error';

    return {
      status: overallStatus,
      info: {
        database: { status: dbStatus },
        redis: { status: redisStatus },
      },
    };
  }

  /**
   * GET /api/health/debug-sentry
   * Throws an intentional error to verify Sentry is capturing exceptions.
   */
  @Get('debug-sentry')
  @ApiOperation({ summary: 'Intentional error for Sentry testing' })
  debugSentry(): never {
    throw new Error('Sentry Integration Test Error from NestJS!');
  }
}
