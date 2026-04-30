import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { StockService } from '../../stock/stock.service';
import { PriceService } from '../../price/price.service';
import { KisAdapter } from '../adapters/kis/kis-adapter';
import { Market } from '../../stock/entities/stock.entity';

@Injectable()
export class PriceSyncTask {
  private readonly logger = new Logger(PriceSyncTask.name);

  constructor(
    private readonly stockService: StockService,
    private readonly priceService: PriceService,
    private readonly kisAdapter: KisAdapter,
  ) {}

  @Cron('0 18 * * 1-5')
  async run(): Promise<void> {
    try {
      await this.sync();
    } catch (err) {
      this.logger.error(
        `동기화 중 치명적 오류 발생: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async sync(): Promise<void> {
    const stocks = await this.stockService.findAll();

    if (stocks.length === 0) {
      this.logger.log('등록된 종목 없음. POST /stocks 로 종목을 추가하세요.');
      return;
    }

    this.logger.log(`일봉 + 외인 순매수 동기화 시작: ${stocks.length}개 종목`);

    const to = new Date();
    const from = subDays(to, 30);
    let successCount = 0;
    let failCount = 0;

    for (const stock of stocks) {
      try {
        const market = stock.market === Market.KOSPI ? 'J' : 'Q';

        const prices = await this.kisAdapter.fetchDailyPrices(
          stock.ticker,
          from,
          to,
        );

        if (prices.length === 0) {
          this.logger.warn(`${stock.ticker} OHLCV 없음, 스킵`);
          successCount++;
          continue;
        }

        // OHLCV 최신 거래일 기준으로 투자자 API 호출 (미래/비거래일 방지)
        const latestTradingDate = new Date(prices[0].date);
        const investorData = await this.kisAdapter.fetchInvestorTradeDailyByStock(
          stock.ticker,
          market,
          from,
          latestTradingDate,
        );

        const investorMap = new Map(
          investorData.map((d) => [d.date, d.foreignNetBuy]),
        );

        for (const price of prices) {
          const foreignNetBuy = investorMap.get(price.date);
          await this.priceService.upsert(
            stock.ticker,
            { ...price, foreignNetBuy: foreignNetBuy ?? 0 },
            foreignNetBuy !== undefined,
          );
        }

        successCount++;
      } catch (err) {
        failCount++;
        this.logger.error(
          `동기화 실패: ${stock.ticker} — ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`동기화 완료 (성공: ${successCount}, 실패: ${failCount})`);
  }
}
