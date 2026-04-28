export interface CandleDto {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function bodySize(candle: CandleDto): number {
  return Math.abs(candle.close - candle.open);
}

export function lowerTailSize(candle: CandleDto): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

export function isOutlierTail(candle: CandleDto): boolean {
  return lowerTailSize(candle) > bodySize(candle) * 2;
}
