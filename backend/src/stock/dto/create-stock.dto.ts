import { IsEnum, IsString, Length } from 'class-validator';
import { Market } from '../entities/stock.entity';

export class CreateStockDto {
  @IsString()
  @Length(1, 10)
  ticker: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsEnum(Market)
  market: Market;
}
