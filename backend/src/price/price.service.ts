import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyPrice } from './entities/daily-price.entity';
import { StockService } from '../stock/stock.service';
import { CreateDailyPriceDto } from './dto/create-daily-price.dto';
import { QueryPriceDto } from './dto/query-price.dto';
import { CandlePatternDetector, CandleCategory } from '../common/utils/candle-pattern.util';
import { calcSupportFloor, evaluateSwingSignalWithCandle, SignalResult } from '../common/utils/signal.util';

@Injectable()
export class PriceService {
  constructor(
    @InjectRepository(DailyPrice)
    private readonly priceRepo: Repository<DailyPrice>,
    private readonly stockService: StockService,
  ) {}

  async findAll(ticker: string, query: QueryPriceDto): Promise<DailyPrice[]> {
    const stock = await this.stockService.findOne(ticker);

    const where: Record<string, unknown> = { stock };
    if (query.from && query.to) {
      where.date = Between(query.from, query.to);
    }

    return this.priceRepo.find({
      where,
      order: { date: 'ASC' },
    });
  }

  async findOne(ticker: string, date: string): Promise<DailyPrice> {
    const stock = await this.stockService.findOne(ticker);
    const price = await this.priceRepo.findOne({
      where: { stock, date },
    });
    if (!price) {
      throw new NotFoundException(
        `일봉 데이터를 찾을 수 없습니다: ${ticker} ${date}`,
      );
    }
    return price;
  }

  async upsert(
    ticker: string,
    dto: CreateDailyPriceDto,
    updateForeignNetBuy = true,
  ): Promise<DailyPrice> {
    const stock = await this.stockService.findOne(ticker);

    const updateCols = ['open', 'high', 'low', 'close', 'volume', 'changeRate'];
    if (updateForeignNetBuy) updateCols.push('foreignNetBuy');

    await this.priceRepo
      .createQueryBuilder()
      .insert()
      .into(DailyPrice)
      .values({ ...dto, stock })
      .orUpdate(updateCols, ['stockId', 'date'])
      .execute();

    return this.findOne(ticker, dto.date);
  }

  async remove(ticker: string, date: string): Promise<void> {
    const price = await this.findOne(ticker, date);
    await this.priceRepo.remove(price);
  }

  async getSignal(ticker: string, currentChangeRate?: number): Promise<{
    patternName: string;
    patternCategory: CandleCategory | null;
    stopLoss: number;
    status: SignalResult['status'];
    isRecommend: boolean;
    reason: string;
  }> {
    const toStr = new Date().toISOString().slice(0, 10);
    const fromStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const query = Object.assign(new QueryPriceDto(), { from: fromStr, to: toStr });
    const prices = await this.findAll(ticker, query);
    const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length < 2) {
      return {
        patternName: '',
        patternCategory: null,
        stopLoss: 0,
        status: '조건 대기',
        isRecommend: false,
        reason: '데이터가 충분하지 않습니다.',
      };
    }

    let consecutiveForeignBuyDays = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (Number(sorted[i].foreignNetBuy) > 0) consecutiveForeignBuyDays++;
      else break;
    }

    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const volumeRatio =
      Number(prev.volume) > 0
        ? (Number(latest.volume) / Number(prev.volume)) * 100
        : 0;
    const priceChangeRate = currentChangeRate ?? Number(latest.changeRate);

    const currentPrice = Number(latest.close);
    const detector = new CandlePatternDetector();
    const recentCandles = sorted.map((p) => ({
      open: Number(p.open),
      high: Number(p.high),
      low: Number(p.low),
      close: Number(p.close),
    }));
    const { patternName, category: patternCategory } =
      await detector.detectPattern(recentCandles);

    const stopLoss = Math.floor(calcSupportFloor(recentCandles, 15));

    const noPattern =
      patternName === '식별된 패턴 없음' || patternName === '데이터 없음';

    const signalResult = evaluateSwingSignalWithCandle({
      consecutiveForeignBuyDays,
      volumeRatio,
      priceChangeRate,
      candlePatternCategory: patternCategory,
      candlePatternName: noPattern ? undefined : patternName,
    });

    return {
      patternName: noPattern ? '' : patternName,
      patternCategory,
      stopLoss,
      ...signalResult,
    };
  }
}
