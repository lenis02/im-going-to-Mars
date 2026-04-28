import { IsDateString, IsOptional } from 'class-validator';

export class QueryValuationDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
