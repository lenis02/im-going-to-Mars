import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Market } from '../entities/stock.entity';

export class UpdateStockDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsEnum(Market)
  market?: Market;
}
