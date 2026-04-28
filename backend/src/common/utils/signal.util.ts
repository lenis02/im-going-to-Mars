import { CandleDto, isOutlierTail } from './candle.util';

export interface DailyPriceDto extends CandleDto {
  date: string;
  volume: number;
  foreignNetBuy: number;
}

const FOREIGN_LOOKBACK_MIN = 5;
const FOREIGN_LOOKBACK_MAX = 10;
const VOLUME_EXPLOSION_RATIO = 2.0;
const BREAKOUT_MIN = 0.02;
const BREAKOUT_MAX = 0.07;
const EXIT_LOOKBACK_MAX = 15;

export function isEntrySignal(
  prices: DailyPriceDto[],
  recentHigh: number,
): boolean {
  if (prices.length < FOREIGN_LOOKBACK_MAX + 1) return false;

  const today = prices[prices.length - 1];
  const yesterday = prices[prices.length - 2];

  const foreignWindow = prices.slice(-FOREIGN_LOOKBACK_MAX);
  const minWindow = prices.slice(-FOREIGN_LOOKBACK_MIN);

  const allForeignPositive =
    foreignWindow.every((p) => p.foreignNetBuy > 0) ||
    minWindow.every((p) => p.foreignNetBuy > 0);

  const volumeExploded =
    today.volume >= yesterday.volume * VOLUME_EXPLOSION_RATIO;

  const breakoutRatio = (today.close - recentHigh) / recentHigh;
  const inBreakoutRange =
    breakoutRatio >= BREAKOUT_MIN && breakoutRatio <= BREAKOUT_MAX;

  return allForeignPositive && volumeExploded && inBreakoutRange;
}

export function calcSupportFloor(
  candles: CandleDto[],
  lookback: number = EXIT_LOOKBACK_MAX,
): number {
  const window = candles.slice(-lookback);
  const filtered = window.filter((c) => !isOutlierTail(c));
  const lows = filtered.map((c) => Math.min(c.open, c.close));
  return Math.min(...lows);
}

export function isExitSignal(
  currentPrice: number,
  supportFloor: number,
): boolean {
  return currentPrice < supportFloor;
}
