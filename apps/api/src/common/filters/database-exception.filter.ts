import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DatabaseError } from 'pg';
import { UnsupportedQueryError } from '../../database/database.service';
import { redactUrl } from '../utils/redact.util';

/**
 * Turns PostgreSQL errors into proper HTTP responses. Without it every database
 * error — a duplicate email, a malformed UUID in a URL — surfaced as a bare 500.
 *
 * The client only ever gets a generic message: raw database messages name
 * tables, columns and constraints and must not leak. The full error is logged.
 */
@Catch(DatabaseError, UnsupportedQueryError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: DatabaseError | UnsupportedQueryError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.describe(exception);

    const log = `${request.method} ${redactUrl(request.url)} → ${status}: ${exception.message}`;
    if (status >= 500) this.logger.error(log, exception.stack);
    else this.logger.warn(log);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    });
  }

  private describe(exception: DatabaseError | UnsupportedQueryError): { status: number; message: string } {
    const code = exception instanceof DatabaseError ? exception.code : undefined;
    switch (code) {
      case '23505': // unique_violation
        return { status: HttpStatus.CONFLICT, message: 'A record with these details already exists.' };
      case '23503': // foreign_key_violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'This record is linked to other records and cannot be changed this way.',
        };
      case '23502': // not_null_violation
      case '23514': // check_violation
        return { status: HttpStatus.BAD_REQUEST, message: 'A required value is missing or invalid.' };
      case '22001': // string_data_right_truncation
        return { status: HttpStatus.BAD_REQUEST, message: 'One of the values is too long.' };
      case '22P02': // invalid_text_representation (bad UUID / enum value)
      case '22007': // invalid_datetime_format
      case '22008': // datetime_field_overflow
        return { status: HttpStatus.BAD_REQUEST, message: 'One of the values has an invalid format.' };
      case 'P0001': // RAISE EXCEPTION from our own triggers — the text is ours and safe to show
        return { status: HttpStatus.BAD_REQUEST, message: exception.message };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
  }
}
