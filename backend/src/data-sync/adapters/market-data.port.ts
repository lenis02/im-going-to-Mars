export interface OhlcvDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DailyInvestorDto {
  date: string;
  foreignNetBuy: number;
}

export interface MarketDataPort {
  fetchDailyPrices(ticker: string, from: Date, to: Date): Promise<OhlcvDto[]>;
  fetchInvestorTradeDailyByStock(
    ticker: string,
    market: 'J' | 'Q',
    from: Date,
    to: Date,
  ): Promise<DailyInvestorDto[]>;
}
