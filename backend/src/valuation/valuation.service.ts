import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Valuation } from './entities/valuation.entity';
import { StockService } from '../stock/stock.service';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { QueryValuationDto } from './dto/query-valuation.dto';

@Injectable()
export class ValuationService {
  constructor(
    @InjectRepository(Valuation)
    private readonly valuationRepo: Repository<Valuation>,
    private readonly stockService: StockService,
  ) {}

  async findAll(
    ticker: string,
    query: QueryValuationDto,
  ): Promise<Valuation[]> {
    const stock = await this.stockService.findOne(ticker);
    const where: Record<string, unknown> = { stock };
    if (query.from && query.to) {
      where.date = Between(query.from, query.to);
    }

    return this.valuationRepo.find({
      where,
      order: { date: 'ASC' },
    });
  }

  async findOne(ticker: string, date: string): Promise<Valuation> {
    const stock = await this.stockService.findOne(ticker);
    const valuation = await this.valuationRepo.findOne({
      where: { stock, date },
    });
    if (!valuation) {
      throw new NotFoundException(
        `밸류에이션 데이터를 찾을 수 없습니다: ${ticker} ${date}`,
      );
    }
    return valuation;
  }

  async upsert(ticker: string, dto: CreateValuationDto): Promise<Valuation> {
    const stock = await this.stockService.findOne(ticker);

    await this.valuationRepo
      .createQueryBuilder()
      .insert()
      .into(Valuation)
      .values({ ...dto, stock })
      .orUpdate(['pbr', 'per'], ['stock_id', 'date'])
      .execute();

    return this.findOne(ticker, dto.date);
  }

  async remove(ticker: string, date: string): Promise<void> {
    const valuation = await this.findOne(ticker, date);
    await this.valuationRepo.remove(valuation);
  }
}
