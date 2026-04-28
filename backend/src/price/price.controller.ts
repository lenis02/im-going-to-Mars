import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PriceService } from './price.service';
import { CreateDailyPriceDto } from './dto/create-daily-price.dto';
import { QueryPriceDto } from './dto/query-price.dto';

@Controller('stocks/:ticker/prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  async findAll(
    @Param('ticker') ticker: string,
    @Query() query: QueryPriceDto,
  ) {
    const data = await this.priceService.findAll(ticker, query);
    return { data, meta: { ticker, count: data.length } };
  }

  @Get(':date')
  async findOne(@Param('ticker') ticker: string, @Param('date') date: string) {
    const data = await this.priceService.findOne(ticker, date);
    return { data };
  }

  @Post()
  async upsert(
    @Param('ticker') ticker: string,
    @Body() dto: CreateDailyPriceDto,
  ) {
    const data = await this.priceService.upsert(ticker, dto);
    return { data };
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('ticker') ticker: string, @Param('date') date: string) {
    return this.priceService.remove(ticker, date);
  }
}
