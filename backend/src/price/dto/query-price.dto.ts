import { IsDateString, IsOptional } from 'class-validator';

export class QueryPriceDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
