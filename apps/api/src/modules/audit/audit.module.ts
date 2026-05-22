import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * AuditModule is global — any module can inject AuditService
 * without importing AuditModule explicitly.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
