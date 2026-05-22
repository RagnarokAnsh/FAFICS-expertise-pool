import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response shape returned by all successful endpoints.
 */
export interface TransformedResponse<T> {
  data: T;
  meta: {
    timestamp: string;
  };
}

/**
 * Wraps all successful responses in a standardized envelope: { data, meta }.
 * Health endpoint is excluded to avoid breaking Docker healthcheck expectations.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, TransformedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<TransformedResponse<T>> {
    const request = context.switchToHttp().getRequest<{ url: string }>();

    // Skip transformation for health endpoint — Docker expects raw JSON
    if (request.url.includes('/health')) {
      return next.handle() as Observable<TransformedResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => ({
        data: data as T,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
