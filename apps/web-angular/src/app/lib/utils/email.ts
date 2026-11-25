import { z } from 'zod';

const emailSchema = z.string().email();

/**
 * The application form's email rule (application.schema.ts). Every address it
 * accepts is also accepted by the API's @IsEmail(), so a form using this never
 * sends an address the server will reject.
 */
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value.trim()).success;
}
