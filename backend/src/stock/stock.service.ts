import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
  ) {}

  findAll(): Promise<Stock[]> {
    return this.stockRepo.find({ order: { ticker: 'ASC' } });
  }

  async findOne(ticker: string): Promise<Stock> {
    const stock = await this.stockRepo.findOneBy({ ticker });
    if (!stock) throw new NotFoundException(`종목을 찾을 수 없습니다: ${ticker}`);
    return stock;
  }

  create(dto: CreateStockDto): Promise<Stock> {
    const stock = this.stockRepo.create(dto);
    return this.stockRepo.save(stock);
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
