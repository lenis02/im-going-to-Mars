import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AxiosError } from 'axios';
import { PriceSyncTask } from './tasks/price-sync.task';
import { SignalDetectTask } from './tasks/signal-detect.task';
import { KisAdapter } from './adapters/kis/kis-adapter';
import { StockService } from '../stock/stock.service';
import { CreateStockDto } from '../stock/dto/create-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('data-sync')
@UseGuards(JwtAuthGuard)
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly priceSyncTask: PriceSyncTask,
    private readonly signalDetectTask: SignalDetectTask,
    private readonly kisAdapter: KisAdapter,
    private readonly stockService: StockService,
  ) {}

  @Post('stocks')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async addStock(@Body() dto: CreateStockDto, @CurrentUser() user: User) {
    await this.stockService.upsert(dto, user.id);
    const data = await this.stockService.findOne(dto.ticker, user.id);
    void this.priceSyncTask.runForTicker(dto.ticker, user.id);
    return { data };
  }

  @Post('prices')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async syncPrices(@CurrentUser() user: User) {
    await this.priceSyncTask.run(user.id);
    return { message: '일봉 동기화가 완료되었습니다.' };
  }

  @Post('prices/:ticker')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async syncPriceForTicker(@Param('ticker') ticker: string, @CurrentUser() user: User) {
    await this.priceSyncTask.runForTicker(ticker.toUpperCase(), user.id);
    return { message: `${ticker.toUpperCase()} 동기화가 완료되었습니다.` };
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
      if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        throw new ServiceUnavailableException('시세 조회 불가 (장 마감 또는 KIS API 오류)');
      }
      throw err;
    }
  }
}
