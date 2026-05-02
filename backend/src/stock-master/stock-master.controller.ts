import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockMasterService } from './stock-master.service';

@Controller('stock-master')
@UseGuards(JwtAuthGuard)
export class StockMasterController {
  constructor(private readonly service: StockMasterService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q?.trim()) return { data: [] };
    const results = await this.service.search(q.trim());
    return { data: results };
  }

  @Get('sync')
  async sync() {
    await this.service.syncFromKrx();
    return { data: { ok: true } };
  }
}
