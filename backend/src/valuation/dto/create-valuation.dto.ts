import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateValuationDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pbr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  per?: number;
}
