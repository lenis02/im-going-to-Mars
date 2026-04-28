import { Module } from '@nestjs/common';
import { ValuationService } from './valuation.service';

@Module({
  providers: [ValuationService]
})
export class ValuationModule {}
