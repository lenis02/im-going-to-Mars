import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyPrice } from './entities/daily-price.entity';
import { StockService } from '../stock/stock.service';
import { CreateDailyPriceDto } from './dto/create-daily-price.dto';
import { QueryPriceDto } from './dto/query-price.dto';

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

  async upsert(ticker: string, dto: CreateDailyPriceDto): Promise<DailyPrice> {
    const stock = await this.stockService.findOne(ticker);

    await this.priceRepo
      .createQueryBuilder()
      .insert()
      .into(DailyPrice)
      .values({ ...dto, stock })
      .orUpdate(
        ['open', 'high', 'low', 'close', 'volume', 'foreign_net_buy'],
        ['stock_id', 'date'],
      )
      .execute();

    return this.findOne(ticker, dto.date);
  }

  async remove(ticker: string, date: string): Promise<void> {
    const price = await this.findOne(ticker, date);
    await this.priceRepo.remove(price);
  }
}
