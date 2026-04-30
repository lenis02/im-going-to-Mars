import { IsString, Length } from 'class-validator';

export class CreateStockDto {
  @IsString()
  @Length(1, 10)
  ticker: string;

  @IsString()
  @Length(1, 100)
  name: string;
}
