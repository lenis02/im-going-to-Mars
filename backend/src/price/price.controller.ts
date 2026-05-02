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
  UseGuards,
} from '@nestjs/common';
import { PriceService } from './price.service';
import { CreateDailyPriceDto } from './dto/create-daily-price.dto';
import { QueryPriceDto } from './dto/query-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stocks/:ticker/prices')
@UseGuards(JwtAuthGuard)
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  async findAll(@Param('ticker') ticker: string, @Query() query: QueryPriceDto) {
    const data = await this.priceService.findAll(ticker, query);
    return { data, meta: { ticker, count: data.length } };
  }

  @Get('signal')
  async getSignal(
    @Param('ticker') ticker: string,
    @Query('changeRate') changeRate?: string,
  ) {
    const currentChangeRate = changeRate !== undefined ? Number(changeRate) : undefined;
    const data = await this.priceService.getSignal(ticker, currentChangeRate);
    return { data };
  }

  @Get(':date')
  async findOne(@Param('ticker') ticker: string, @Param('date') date: string) {
    const data = await this.priceService.findOne(ticker, date);
    return { data };
  }

  @Post()
  async upsert(@Param('ticker') ticker: string, @Body() dto: CreateDailyPriceDto) {
    const data = await this.priceService.upsert(ticker, dto);
    return { data };
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('ticker') ticker: string, @Param('date') date: string) {
    return this.priceService.remove(ticker, date);
  }
}
