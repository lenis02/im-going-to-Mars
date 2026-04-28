import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KisAuthService } from './adapters/kis/kis-auth.service';
import { KisAdapter } from './adapters/kis/kis-adapter';
import { PriceSyncTask } from './tasks/price-sync.task';
import { SignalDetectTask } from './tasks/signal-detect.task';
import { StockModule } from '../stock/stock.module';
import { PriceModule } from '../price/price.module';
import { SignalModule } from '../signal/signal.module';

@Module({
  imports: [HttpModule, StockModule, PriceModule, SignalModule],
  providers: [KisAuthService, KisAdapter, PriceSyncTask, SignalDetectTask],
})
export class DataSyncModule {}
