import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AxiosError } from 'axios';
import { PriceSyncTask } from './tasks/price-sync.task';
import { SignalDetectTask } from './tasks/signal-detect.task';
import { KisAdapter } from './adapters/kis/kis-adapter';

@Controller('data-sync')
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly priceSyncTask: PriceSyncTask,
    private readonly signalDetectTask: SignalDetectTask,
    private readonly kisAdapter: KisAdapter,
  ) {}

  @Post('prices')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async syncPrices() {
    await this.priceSyncTask.run();
    return { message: '일봉 동기화가 완료되었습니다.' };
  }

  @Post('signals')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  detectSignals() {
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

  @Get('quote/:ticker')
  async currentPrice(@Param('ticker') ticker: string) {
    try {
      const data = await this.kisAdapter.fetchCurrentPrice(ticker.toUpperCase());
      return { data };
    } catch (err) {
      const axiosErr = err as AxiosError;
      // 장 마감 등으로 KIS API가 5xx를 반환하면 503으로 조용히 처리
      if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        throw new ServiceUnavailableException('시세 조회 불가 (장 마감 또는 KIS API 오류)');
      }
      throw err;
    }
  }
}
