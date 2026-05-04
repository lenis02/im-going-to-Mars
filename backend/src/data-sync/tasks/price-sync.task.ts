import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { StockService } from '../../stock/stock.service';
import { PriceService } from '../../price/price.service';
import { KisAdapter } from '../adapters/kis/kis-adapter';

@Injectable()
export class PriceSyncTask {
  private readonly logger = new Logger(PriceSyncTask.name);

  constructor(
    private readonly stockService: StockService,
    private readonly priceService: PriceService,
    private readonly kisAdapter: KisAdapter,
  ) {}

  // 자동 크론은 전체 종목 동기화
  @Cron('0 18 * * 1-5')
  async runAll(): Promise<void> {
    try {
      await this.sync();
    } catch (err) {
      this.logger.error(
        `동기화 중 치명적 오류 발생: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // 사용자 버튼 클릭 시 해당 유저 종목만 동기화
  async run(userId: number): Promise<void> {
    try {
      await this.sync(userId);
    } catch (err) {
      this.logger.error(
        `동기화 중 치명적 오류 발생: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // 단일 종목 동기화 (종목 추가 직후 호출)
  async runForTicker(ticker: string, userId: number): Promise<void> {
    const to = new Date();
    const from = subDays(to, 30);
    try {
      const stock = await this.stockService.findOne(ticker, userId);
      await this.syncStock(stock.ticker, from, to);
      this.logger.log(`단일 종목 동기화 완료: ${ticker}`);
    } catch (err) {
      this.logger.error(`단일 종목 동기화 실패: ${ticker} — ${(err as Error).message}`);
    }
  }

  private async sync(userId?: number): Promise<void> {
    const stocks = await this.stockService.findAll(userId);

    if (stocks.length === 0) {
      this.logger.log('등록된 종목 없음. 종목을 추가하세요.');
      return;
    }

    this.logger.log(`일봉 + 외인 순매수 동기화 시작: ${stocks.length}개 종목`);

    const to = new Date();
    const from = subDays(to, 30);
    let successCount = 0;
    let failCount = 0;

    for (const stock of stocks) {
      try {
        await this.syncStock(stock.ticker, from, to);
        successCount++;
      } catch (err) {
        failCount++;
        this.logger.error(`동기화 실패: ${stock.ticker} — ${(err as Error).message}`);
      }
    }

    this.logger.log(`동기화 완료 (성공: ${successCount}, 실패: ${failCount})`);
  }

  private async syncStock(ticker: string, from: Date, to: Date): Promise<void> {
    const prices = await this.kisAdapter.fetchDailyPrices(ticker, from, to);

    if (prices.length === 0) {
      this.logger.warn(`${ticker} OHLCV 없음, 스킵`);
      return;
    }

    const latestTradingDate = new Date(prices[0].date);
    const investorData = await this.kisAdapter.fetchInvestorTradeDailyByStock(
      ticker,
      from,
      latestTradingDate,
    );

    const investorMap = new Map(investorData.map((d) => [d.date, d.foreignNetBuy]));

    for (const price of prices) {
      const foreignNetBuy = investorMap.get(price.date);
      await this.priceService.upsert(
        ticker,
        { ...price, foreignNetBuy: foreignNetBuy ?? 0 },
        foreignNetBuy !== undefined,
      );
    }
  }
}
