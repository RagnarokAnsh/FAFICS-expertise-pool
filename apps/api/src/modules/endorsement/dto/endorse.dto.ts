import { IsOptional, IsString } from 'class-validator';

export class EndorseDto {
  @IsOptional()
  @IsString()
  presidentNotes?: string;
}
