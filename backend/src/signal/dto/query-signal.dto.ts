import { IsEnum, IsOptional } from 'class-validator';
import { SignalType } from '../entities/signal.entity';

export class QuerySignalDto {
  @IsOptional()
  @IsEnum(SignalType)
  type?: SignalType;
}
