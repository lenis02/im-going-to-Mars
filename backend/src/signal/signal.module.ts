import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signal } from './entities/signal.entity';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { StockModule } from '../stock/stock.module';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [TypeOrmModule.forFeature([Signal]), StockModule, PriceModule],
  controllers: [SignalController],
  providers: [SignalService],
  exports: [SignalService],
})
export class SignalModule {}
