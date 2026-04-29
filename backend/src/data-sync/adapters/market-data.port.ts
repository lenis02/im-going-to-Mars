export interface OhlcvDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changeRate: number; // 전일 대비율 (기준가 기준, KIS 계산값)
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
