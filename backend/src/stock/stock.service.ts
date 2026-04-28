import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

export interface ForeignRankingRow {
  ticker: string;
  name: string;
  market: string;
  foreignNetBuy: number;
  date: string;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Stock[]> {
    return this.stockRepo.find({ order: { ticker: 'ASC' } });
  }

  async findForeignRanking(): Promise<ForeignRankingRow[]> {
    return this.dataSource.query<ForeignRankingRow[]>(`
      SELECT
        s.ticker,
        s.name,
        s.market,
        dp.foreign_net_buy AS "foreignNetBuy",
        dp.date
      FROM stock s
      JOIN daily_price dp ON dp.stock_id = s.id
      WHERE dp.date = (
        SELECT MAX(d.date) FROM daily_price d WHERE d.stock_id = s.id
      )
      ORDER BY dp.foreign_net_buy DESC
    `);
  }

  async findOne(ticker: string): Promise<Stock> {
    const stock = await this.stockRepo.findOneBy({ ticker });
    if (!stock)
      throw new NotFoundException(`종목을 찾을 수 없습니다: ${ticker}`);
    return stock;
  }

  create(dto: CreateStockDto): Promise<Stock> {
    const stock = this.stockRepo.create(dto);
    return this.stockRepo.save(stock);
  }

  async upsert(dto: CreateStockDto): Promise<void> {
    await this.stockRepo
      .createQueryBuilder()
      .insert()
      .into(Stock)
      .values(dto)
      .orUpdate(['name', 'market'], ['ticker'])
      .execute();
  }

  async update(ticker: string, dto: UpdateStockDto): Promise<Stock> {
    const stock = await this.findOne(ticker);
    Object.assign(stock, dto);
    return this.stockRepo.save(stock);
  }

  async remove(ticker: string): Promise<void> {
    const stock = await this.findOne(ticker);
    await this.stockRepo.remove(stock);
  }
}
