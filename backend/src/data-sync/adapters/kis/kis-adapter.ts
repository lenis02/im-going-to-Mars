import { MarketDataPort, OhlcvDto } from '../market-data.port';

export class KisAdapter implements MarketDataPort {
  fetchDailyPrices(
    _ticker: string,
    _from: Date,
    _to: Date,
  ): Promise<OhlcvDto[]> {
    throw new Error('KisAdapter.fetchDailyPrices: not implemented');
  }

  fetchForeignNetBuy(_ticker: string, _date: Date): Promise<number> {
    throw new Error('KisAdapter.fetchForeignNetBuy: not implemented');
  }
}
