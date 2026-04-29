import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { KisAuthService } from './adapters/kis/kis-auth.service';
import { KisAdapter } from './adapters/kis/kis-adapter';
import { PriceSyncTask } from './tasks/price-sync.task';
import { SignalDetectTask } from './tasks/signal-detect.task';
import { DataSyncController } from './data-sync.controller';
import { StockModule } from '../stock/stock.module';
import { PriceModule } from '../price/price.module';
import { SignalModule } from '../signal/signal.module';

// KIS 모의투자 서버의 SSL 인증서 도메인 불일치 이슈 우회 (개발 전용)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: process.env.NODE_ENV !== 'production' ? httpsAgent : undefined,
    }),
    StockModule,
    PriceModule,
    SignalModule,
  ],
  controllers: [DataSyncController],
  providers: [KisAuthService, KisAdapter, PriceSyncTask, SignalDetectTask],
})
export class DataSyncModule {}
