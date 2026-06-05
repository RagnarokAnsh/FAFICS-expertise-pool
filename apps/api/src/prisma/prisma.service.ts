import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService extends PrismaClient to integrate with the NestJS lifecycle.
 * Connects on module init and disconnects on module destroy for clean shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Emit error/warn as events so they go through the Nest logger. Query
    // logging is intentionally omitted — it is noisy and would log parameter
    // values (PII) on every statement in production.
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  /**
   * Connect to the database when the module initializes.
   */
  async onModuleInit(): Promise<void> {
    // Surface DB-level errors/warnings through the application logger.
    this.$on('error' as never, (e: any) => this.logger.error(e?.message ?? e));
    this.$on('warn' as never, (e: any) => this.logger.warn(e?.message ?? e));

    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  /**
   * Disconnect from the database when the module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
