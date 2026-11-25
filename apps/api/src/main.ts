import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Bootstrap the NestJS application.
 * Configures: Helmet, CORS, global pipes/filters/interceptors, Swagger, port.
 */
async function bootstrap(): Promise<void> {
  // Only JSON bodies are parsed (the built-in form-urlencoded parser is off).
  // The web app only ever sends JSON, and an HTML form on another site can
  // only send form-encoded or text bodies — so a forged form post reaches the
  // API with an empty body and fails validation (CSRF defence in depth,
  // alongside the SameSite=Lax session cookie).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json');
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Security ────────────────────────────────────────────────────────
  app.use(helmet());
  // Browser origins allowed to call the API with credentials (comma-separated).
  // Defaults to the site's own address (WEB_BASE_URL, also used in email links).
  const corsOrigins = (process.env.CORS_ORIGINS || process.env.WEB_BASE_URL || 'https://fafics.com')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Edit-Token',
    ],
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
  app.useGlobalFilters(new HttpExceptionFilter(), new DatabaseExceptionFilter());

  // ── Global interceptors ────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger ────────────────────────────────────────────────────────
  // The full API map is not published in production unless explicitly enabled.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
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
  }

  // ── Start ──────────────────────────────────────────────────────────
  const port = configService.get<number>('API_PORT', 3001);
  await app.listen(port);
  logger.log(`FAFICS API is running on http://localhost:${port}`);
  if (swaggerEnabled) logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
