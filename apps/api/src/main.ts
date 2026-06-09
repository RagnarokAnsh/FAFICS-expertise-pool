import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Bootstrap the NestJS application.
 * Configures: Helmet, CORS, global pipes/filters/interceptors, Swagger, port.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Security ────────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    // credentials:true is required so the browser sends/stores the HttpOnly
    // auth cookie on cross-origin admin requests.
    origin: configService.get<string>('WEB_BASE_URL', 'http://localhost:3000'),
    credentials: true,
  });
  // Trust the first proxy hop (Vercel/NGINX/etc.) so the rate limiter and logs
  // see the real client IP from X-Forwarded-For rather than the proxy's.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── Global prefix ──────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global pipes ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global filters ─────────────────────────────────────────────────
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // ── Global interceptors ────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger ────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FAFICS Expertise Pool API')
    .setDescription(
      'API for managing the FAFICS volunteer expert roster — applications, endorsements, approvals, and exports.',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Start ──────────────────────────────────────────────────────────
  const port = configService.get<number>('API_PORT', 3001);
  await app.listen(port);
  logger.log(`FAFICS API is running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
