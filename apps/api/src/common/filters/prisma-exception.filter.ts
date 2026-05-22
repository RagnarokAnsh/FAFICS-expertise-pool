import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Maps Prisma error codes to HTTP status codes.
 * Catches PrismaClientKnownRequestError and returns a meaningful response.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let message: string;

    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || ['field'];
        message = `A record with this ${target.join(', ')} already exists.`;
        break;
      }
      // Record not found
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested record was not found.';
        break;
      }
      // Foreign key constraint failure
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record not found. Please check foreign key references.';
        break;
      }
      // Required relation violation
      case 'P2014': {
        status = HttpStatus.BAD_REQUEST;
        message = 'A required relation is missing.';
        break;
      }
      default: {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'An unexpected database error occurred.';
        break;
      }
    }

    this.logger.error(
      `Prisma error ${exception.code}: ${exception.message}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
      error: exception.code,
    });
  }
}
