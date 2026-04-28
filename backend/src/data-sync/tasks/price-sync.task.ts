import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PriceSyncTask {
  private readonly logger = new Logger(PriceSyncTask.name);

  @Cron('0 18 * * 1-5')
  async run(): Promise<void> {
    this.logger.log('price-sync started');
    // TODO: inject StockService + MarketDataPort, iterate tickers
  }
}
