import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { QueueModule } from './modules/queue/queue.module';
import { MailModule } from './modules/mail/mail.module';
import { EndorsementModule } from './modules/endorsement/endorsement.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ExportModule } from './modules/export/export.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import mailConfig from './config/mail.config';
import jwtConfig from './config/jwt.config';

/**
 * Root application module.
 * Imports ConfigModule (global, Joi-validated), PrismaModule (global),
 * AuditModule (global), ScheduleModule, HealthModule, and all feature modules.
 */
@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [appConfig, databaseConfig, redisConfig, mailConfig, jwtConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        API_PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('8h'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        PRESIDENT_LINK_TTL_MS: Joi.number().default(1209600000),
        EMAIL_VERIFY_TTL_MS: Joi.number().default(86400000),
        PASSWORD_RESET_TTL_MS: Joi.number().default(3600000),
        RESEND_API_KEY: Joi.string().default('re_test'),
        FROM_EMAIL: Joi.string().default('noreply@fafics.org'),
        SECRETARY_EMAIL: Joi.string().default('secretary@fafics.org'),
        API_BASE_URL: Joi.string().default('http://localhost:3001'),
        WEB_BASE_URL: Joi.string().default('http://localhost:3000'),
        ADMIN_EMAIL: Joi.string().default('admin@fafics.org'),
        ADMIN_PASSWORD: Joi.string().default('changeme123!'),
        SMTP_HOST: Joi.string().default('localhost'),
        SMTP_PORT: Joi.number().default(1025),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ── Scheduling (required for @Cron decorators) ────────────────────
    ScheduleModule.forRoot(),

    // ── Global modules ────────────────────────────────────────────────
    PrismaModule,
    AuditModule,

    // ── Feature modules ───────────────────────────────────────────────
    HealthModule,
    ApplicationsModule,
    TokensModule,
    QueueModule,
    MailModule,
    EndorsementModule,

    // ── Phase 3 modules ───────────────────────────────────────────────
    AuthModule,
    AdminModule,
    ExportModule,
  ],
})
export class AppModule {}
