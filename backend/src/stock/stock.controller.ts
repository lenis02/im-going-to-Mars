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
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const data = await this.stockService.findAll(user.id);
    return { data };
  }

  @Get('ranking/foreign')
  async foreignRanking(@CurrentUser() user: User) {
    const data = await this.stockService.findForeignRanking(user.id);
    return { data, meta: { count: data.length } };
  }

  @Get(':ticker')
  async findOne(@Param('ticker') ticker: string, @CurrentUser() user: User) {
    const data = await this.stockService.findOne(ticker, user.id);
    return { data };
  }

  @Post()
  async create(@Body() dto: CreateStockDto, @CurrentUser() user: User) {
    await this.stockService.upsert(dto, user.id);
    const data = await this.stockService.findOne(dto.ticker, user.id);
    return { data };
  }

  @Patch(':ticker')
  async update(
    @Param('ticker') ticker: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: User,
  ) {
    const stock = await this.stockService.findOne(ticker, user.id);
    Object.assign(stock, dto);
    // UpdateStockDto는 name만 변경 가능하므로 upsert로 처리
    await this.stockService.upsert({ ticker: stock.ticker, name: stock.name }, user.id);
    const data = await this.stockService.findOne(ticker, user.id);
    return { data };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAll(@CurrentUser() user: User) {
    return this.stockService.removeAll(user.id);
  }

  @Delete(':ticker')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('ticker') ticker: string, @CurrentUser() user: User) {
    return this.stockService.remove(ticker, user.id);
  }
}
