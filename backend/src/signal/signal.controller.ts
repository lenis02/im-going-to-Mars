import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SignalService } from './signal.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { QuerySignalDto } from './dto/query-signal.dto';

@Controller('stocks/:ticker/signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Get()
  async findAll(
    @Param('ticker') ticker: string,
    @Query() query: QuerySignalDto,
  ) {
    const data = await this.signalService.findAll(ticker, query);
    return { data, meta: { ticker, count: data.length } };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.signalService.findOne(id);
    return { data };
  }

  @Post()
  async create(@Param('ticker') ticker: string, @Body() dto: CreateSignalDto) {
    const data = await this.signalService.create(ticker, dto);
    return { data };
  }

  @Post('detect')
  async detect(@Param('ticker') ticker: string) {
    const data = await this.signalService.detect(ticker);
    return { data, meta: { ticker, count: data.length } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.signalService.remove(id);
  }
}
