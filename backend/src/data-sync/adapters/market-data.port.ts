export interface OhlcvDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataPort {
  fetchDailyPrices(ticker: string, from: Date, to: Date): Promise<OhlcvDto[]>;
  fetchForeignNetBuy(ticker: string, date: Date): Promise<number>;
}
