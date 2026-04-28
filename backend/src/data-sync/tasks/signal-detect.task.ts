import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StockService } from '../../stock/stock.service';
import { SignalService } from '../../signal/signal.service';

@Injectable()
export class SignalDetectTask {
  private readonly logger = new Logger(SignalDetectTask.name);

  constructor(
    private readonly stockService: StockService,
    private readonly signalService: SignalService,
  ) {}

  @Cron('0 19 * * 1-5')
  async run(): Promise<void> {
    this.logger.log('신호 탐지 시작');
    const stocks = await this.stockService.findAll();
    let detected = 0;

    for (const stock of stocks) {
      try {
        const signals = await this.signalService.detect(stock.ticker);
        detected += signals.length;
      } catch (err) {
        this.logger.error(
          `신호 탐지 실패: ${stock.ticker} — ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`신호 탐지 완료 (발생 신호: ${detected}건)`);
  }
}
