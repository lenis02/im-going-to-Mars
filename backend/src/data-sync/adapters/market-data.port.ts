export interface OhlcvDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ForeignRankingDto {
  ticker: string;
  name: string;
  accumulatedNetBuy: number; // 기간 누적 외인 순매수량
}

export interface MarketDataPort {
  fetchDailyPrices(ticker: string, from: Date, to: Date): Promise<OhlcvDto[]>;
  fetchForeignNetBuyRanking(
    market: 'J' | 'Q',
    days: number,
  ): Promise<ForeignRankingDto[]>;
}
