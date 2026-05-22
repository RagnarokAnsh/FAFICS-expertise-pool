import { IsNotEmpty, IsString } from 'class-validator';

export class ReturnDto {
  @IsNotEmpty()
  @IsString()
  presidentNotes!: string;
}
