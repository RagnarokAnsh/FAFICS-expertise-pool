import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — DB ping' })
  async check(): Promise<{ status: string; info: { database: { status: string } } }> {
    let dbStatus = 'up';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      info: { database: { status: dbStatus } },
    };
  }

  @Get('debug-sentry')
  @ApiOperation({ summary: 'Intentional error for Sentry testing' })
  debugSentry(): never {
    throw new Error('Sentry Integration Test Error from NestJS!');
  }
}
