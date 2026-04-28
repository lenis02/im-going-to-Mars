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
import { ValuationService } from './valuation.service';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { QueryValuationDto } from './dto/query-valuation.dto';

@Controller('stocks/:ticker/valuations')
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Get()
  async findAll(
    @Param('ticker') ticker: string,
    @Query() query: QueryValuationDto,
  ) {
    const data = await this.valuationService.findAll(ticker, query);
    return { data, meta: { ticker, count: data.length } };
  }

  @Get(':date')
  async findOne(@Param('ticker') ticker: string, @Param('date') date: string) {
    const data = await this.valuationService.findOne(ticker, date);
    return { data };
  }

  @Post()
  async upsert(
    @Param('ticker') ticker: string,
    @Body() dto: CreateValuationDto,
  ) {
    const data = await this.valuationService.upsert(ticker, dto);
    return { data };
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('ticker') ticker: string, @Param('date') date: string) {
    return this.valuationService.remove(ticker, date);
  }
}
