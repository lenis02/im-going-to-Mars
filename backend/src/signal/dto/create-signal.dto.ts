import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SignalType } from '../entities/signal.entity';

export class CreateSignalDto {
  @IsEnum(SignalType)
  type: SignalType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
