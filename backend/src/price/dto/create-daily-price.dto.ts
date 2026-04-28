import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateDailyPriceDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  open: number;

  @IsNumber()
  @Min(0)
  high: number;

  @IsNumber()
  @Min(0)
  low: number;

  @IsNumber()
  @Min(0)
  close: number;

  @IsInt()
  @Min(0)
  volume: number;

  @IsInt()
  foreignNetBuy: number;
}
