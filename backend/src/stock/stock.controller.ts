import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async findAll() {
    const data = await this.stockService.findAll();
    return { data };
  }

  @Get('ranking/foreign')
  async foreignRanking() {
    const data = await this.stockService.findForeignRanking();
    return { data, meta: { count: data.length } };
  }

  @Get(':ticker')
  async findOne(@Param('ticker') ticker: string) {
    const data = await this.stockService.findOne(ticker);
    return { data };
  }

  @Post()
  async create(@Body() dto: CreateStockDto) {
    const data = await this.stockService.create(dto);
    return { data };
  }

  @Patch(':ticker')
  async update(@Param('ticker') ticker: string, @Body() dto: UpdateStockDto) {
    const data = await this.stockService.update(ticker, dto);
    return { data };
  }

  @Delete(':ticker')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('ticker') ticker: string) {
    return this.stockService.remove(ticker);
  }
}
