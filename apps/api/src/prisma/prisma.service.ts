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
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  /**
   * Connect to the database when the module initializes.
   */
  async onModuleInit(): Promise<void> {
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
