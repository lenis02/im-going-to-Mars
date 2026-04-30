import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PriceSyncTask } from './tasks/price-sync.task';
import { SignalDetectTask } from './tasks/signal-detect.task';
import { KisAdapter } from './adapters/kis/kis-adapter';

@Controller('data-sync')
export class DataSyncController {
  constructor(
    private readonly priceSyncTask: PriceSyncTask,
    private readonly signalDetectTask: SignalDetectTask,
    private readonly kisAdapter: KisAdapter,
  ) {}

  @Post('prices')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncPrices() {
    void this.priceSyncTask.run();
    return { message: '일봉 동기화를 시작했습니다.' };
  }

  @Post('signals')
  @HttpCode(HttpStatus.ACCEPTED)
  async detectSignals() {
    void this.signalDetectTask.run();
    return { message: '신호 탐지를 시작했습니다.' };
  }

  @Get('lookup/:ticker')
  async lookupStock(@Param('ticker') ticker: string) {
    const info = await this.kisAdapter.fetchStockInfo(ticker.toUpperCase());
    if (!info) {
      throw new NotFoundException(`종목을 찾을 수 없습니다: ${ticker}`);
    }
    return { data: { ticker: ticker.toUpperCase(), ...info } };
  }
}
