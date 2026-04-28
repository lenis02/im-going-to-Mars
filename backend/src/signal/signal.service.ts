import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal, SignalType } from './entities/signal.entity';
import { StockService } from '../stock/stock.service';
import { PriceService } from '../price/price.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { QuerySignalDto } from './dto/query-signal.dto';
import {
  DailyPriceDto,
  calcSupportFloor,
  isEntrySignal,
  isExitSignal,
} from '../common/utils/signal.util';

@Injectable()
export class SignalService {
  constructor(
    @InjectRepository(Signal)
    private readonly signalRepo: Repository<Signal>,
    private readonly stockService: StockService,
    private readonly priceService: PriceService,
  ) {}

  async findAll(ticker: string, query: QuerySignalDto): Promise<Signal[]> {
    const stock = await this.stockService.findOne(ticker);
    const where: Record<string, unknown> = { stock };
    if (query.type) where.type = query.type;

    return this.signalRepo.find({
      where,
      order: { triggeredAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Signal> {
    const signal = await this.signalRepo.findOne({
      where: { id },
      relations: ['stock'],
    });
    if (!signal) throw new NotFoundException(`신호를 찾을 수 없습니다: ${id}`);
    return signal;
  }

  async create(ticker: string, dto: CreateSignalDto): Promise<Signal> {
    const stock = await this.stockService.findOne(ticker);
    const signal = this.signalRepo.create({ ...dto, stock });
    return this.signalRepo.save(signal);
  }

  async remove(id: number): Promise<void> {
    const signal = await this.findOne(id);
    await this.signalRepo.remove(signal);
  }

  async detect(ticker: string): Promise<Signal[]> {
    const stock = await this.stockService.findOne(ticker);
    const prices = await this.priceService.findAll(ticker, {});

    if (prices.length < 2) return [];

    const priceDtos: DailyPriceDto[] = prices.map((p) => ({
      date: p.date,
      open: Number(p.open),
      high: Number(p.high),
      low: Number(p.low),
      close: Number(p.close),
      volume: Number(p.volume),
      foreignNetBuy: Number(p.foreignNetBuy),
    }));

    const created: Signal[] = [];
    const recentHigh = Math.max(...priceDtos.map((p) => p.high));
    const currentPrice = priceDtos[priceDtos.length - 1].close;
    const supportFloor = calcSupportFloor(priceDtos);

    await this.signalRepo.manager.transaction(async (manager) => {
      if (isEntrySignal(priceDtos, recentHigh)) {
        const signal = manager.create(Signal, {
          stock,
          type: SignalType.ENTRY,
          price: currentPrice,
          reason: '외인 순매수 지속 + 거래량 폭발 + 전고점 돌파',
        });
        created.push(await manager.save(Signal, signal));
      }

      if (isExitSignal(currentPrice, supportFloor)) {
        const signal = manager.create(Signal, {
          stock,
          type: SignalType.EXIT,
          price: currentPrice,
          reason: `2주 저점 방어선(${supportFloor}) 이탈`,
        });
        created.push(await manager.save(Signal, signal));
      }
    });

    return created;
  }
}
