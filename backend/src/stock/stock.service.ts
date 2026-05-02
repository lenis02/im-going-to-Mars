import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';

export interface ForeignRankingRow {
  ticker: string;
  name: string;
  foreignNetBuy: number;
  date: string;
  consecutiveDays: number;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
  ) {}

  findAll(userId?: number): Promise<Stock[]> {
    if (userId !== undefined) {
      return this.stockRepo.find({ where: { userId }, order: { ticker: 'ASC' } });
    }
    return this.stockRepo.find({ order: { ticker: 'ASC' } });
  }

  findForeignRanking(userId: number): Promise<ForeignRankingRow[]> {
    return this.stockRepo.query(
      `
      WITH ranked AS (
        SELECT
          "stockId",
          "foreignNetBuy",
          date,
          ROW_NUMBER() OVER (PARTITION BY "stockId" ORDER BY date DESC) AS rn
        FROM daily_price
      ),
      consecutive AS (
        SELECT
          "stockId",
          COALESCE(MIN(CASE WHEN "foreignNetBuy" <= 0 THEN rn END) - 1, MAX(rn)) AS consecutive_days
        FROM ranked
        GROUP BY "stockId"
      )
      SELECT
        s.ticker,
        s.name,
        SUM(dp."foreignNetBuy") AS "foreignNetBuy",
        to_char(MAX(dp.date), 'YYYY-MM-DD') AS date,
        COALESCE(c.consecutive_days, 0) AS "consecutiveDays"
      FROM stock s
      JOIN ranked dp ON dp."stockId" = s.id AND dp.rn <= 7
      LEFT JOIN consecutive c ON c."stockId" = s.id
      WHERE s."userId" = $1
      GROUP BY s.id, s.ticker, s.name, c.consecutive_days
      ORDER BY SUM(dp."foreignNetBuy") DESC
      `,
      [userId],
    );
  }

  async findOne(ticker: string, userId?: number): Promise<Stock> {
    const where = userId !== undefined ? { ticker, userId } : { ticker };
    const stock = await this.stockRepo.findOneBy(where);
    if (!stock) throw new NotFoundException(`종목을 찾을 수 없습니다: ${ticker}`);
    return stock;
  }

  async upsert(dto: CreateStockDto, userId: number): Promise<void> {
    await this.stockRepo
      .createQueryBuilder()
      .insert()
      .into(Stock)
      .values({ ...dto, userId })
      .orUpdate(['name'], ['ticker', 'userId'])
      .execute();
  }

  async remove(ticker: string, userId: number): Promise<void> {
    const stock = await this.findOne(ticker, userId);
    await this.stockRepo.remove(stock);
  }

  async removeAll(userId: number): Promise<void> {
    await this.stockRepo.query('DELETE FROM stock WHERE "userId" = $1', [userId]);
  }
}
