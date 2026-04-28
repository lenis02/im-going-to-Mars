import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { StockService } from '../../stock/stock.service';
import { PriceService } from '../../price/price.service';
import { KisAdapter } from '../adapters/kis/kis-adapter';
import { Market } from '../../stock/entities/stock.entity';

const RANKING_DAYS = 5; // 1주일(5거래일) 누적 순매수 기준
const TOP_N = 50; // 상위 50종목 수집

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
    this.logger.log('외인 순매수 순위 기반 일봉 동기화 시작');

    // KOSPI + KOSDAQ 순위를 합산해서 상위 N개 추출
    const [kospiRanking, kosdaqRanking] = await Promise.all([
      this.kisAdapter.fetchForeignNetBuyRanking('J', RANKING_DAYS),
      this.kisAdapter.fetchForeignNetBuyRanking('Q', RANKING_DAYS),
    ]);

    const ranking = [...kospiRanking, ...kosdaqRanking]
      .sort((a, b) => b.accumulatedNetBuy - a.accumulatedNetBuy)
      .slice(0, TOP_N);

    this.logger.log(`순위 수집 완료: ${ranking.length}개 종목`);

    const to = new Date();
    const from = subDays(to, 30); // 최근 30일 일봉 동기화
    let successCount = 0;
    let failCount = 0;

    for (const item of ranking) {
      try {
        // 종목 마스터에 없으면 자동 등록
        const market = kospiRanking.some((r) => r.ticker === item.ticker)
          ? Market.KOSPI
          : Market.KOSDAQ;

        await this.stockService.upsert({
          ticker: item.ticker,
          name: item.name,
          market,
        });

        // 일봉 수집 (foreignNetBuy는 순위에서 받은 주간 누적값 사용)
        const prices = await this.kisAdapter.fetchDailyPrices(
          item.ticker,
          from,
          to,
        );

        for (const price of prices) {
          await this.priceService.upsert(item.ticker, {
            ...price,
            foreignNetBuy: item.accumulatedNetBuy,
          });
        }

        successCount++;
      } catch (err) {
        failCount++;
        this.logger.error(
          `동기화 실패: ${item.ticker} — ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`동기화 완료 (성공: ${successCount}, 실패: ${failCount})`);
  }
}
