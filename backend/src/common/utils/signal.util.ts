import { CandleDto, isOutlierTail } from './candle.util';
import { CandleCategory } from './candle-pattern.util';

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

// ─────────────────────────────────────────────────────────────────────────────
// 캔들 패턴 포함 스윙 매매 평가 (순수 함수)
// ─────────────────────────────────────────────────────────────────────────────

export interface SwingSignalInput {
  /** 최근 7일 중 연속으로 외국인이 순매수한 일수 */
  consecutiveForeignBuyDays: number;
  /** 전일 대비 당일 거래량 비율 (%, 예: 150 = 전일의 150%) */
  volumeRatio: number;
  /** 전일 대비 당일 주가 등락률 (%, 예: 2.5 = +2.5%) */
  priceChangeRate: number;
  /** detectPattern()이 반환한 캔들 카테고리 */
  candlePatternCategory: CandleCategory | null;
  /** detectPattern()이 반환한 패턴 이름 (reason 문구에 활용) */
  candlePatternName?: string;
}

export interface SignalResult {
  status: '스윙 진입' | '과열/하락 경고' | '관심 집중' | '조건 대기';
  /** '스윙 진입'일 때만 true */
  isRecommend: boolean;
  /** 수치 + 캔들 근거를 주린이가 이해하기 쉽게 서술 */
  reason: string;
}

/**
 * 수급·거래량·가격 + 캔들 패턴 카테고리를 종합해 스윙 매매 적합도를 평가한다.
 *
 * 판단 우선순위:
 *  0) 하락 전환형 캔들 → 무조건 '과열/하락 경고'
 *  B) 극단적 과열 수치 → '과열/하락 경고'
 *  A) 이상적 진입 구간 → '스윙 진입' (상승 캔들이면 최강 추천)
 *  C) 조건 일부 충족 또는 좋은 캔들 → '관심 집중'
 *  D) 위 어디도 해당 없음 → '조건 대기'
 */
export function evaluateSwingSignalWithCandle(
  input: SwingSignalInput,
): SignalResult {
  const {
    consecutiveForeignBuyDays,
    volumeRatio,
    priceChangeRate,
    candlePatternCategory,
    candlePatternName,
  } = input;

  const patternLabel = candlePatternName
    ? `'${candlePatternName}'(${candlePatternCategory})`
    : candlePatternCategory
      ? `${candlePatternCategory} 패턴`
      : '뚜렷한 캔들 패턴 없음';

  // ── 0순위: 하락 전환형 캔들 ─────────────────────────────────────
  // 수급·거래량이 아무리 좋아도 추세가 꺾일 위험이 크므로 즉시 경고.
  if (candlePatternCategory === '하락 전환형') {
    return {
      status: '과열/하락 경고',
      isRecommend: false,
      reason:
        `캔들 차트에서 ${patternLabel}이 포착되었습니다. ` +
        `이 패턴은 상승 추세가 꺾이고 하락으로 전환될 수 있다는 경고 신호입니다. ` +
        `외국인 수급(${consecutiveForeignBuyDays}일)이나 거래량(${volumeRatio.toFixed(0)}%)에 관계없이 ` +
        `지금은 신규 매수를 자제하고 보유 중인 종목의 손절 라인을 점검하세요.`,
    };
  }

  // ── 조건 B: 극단적 과열 또는 급락 ──────────────────────────────
  // 하루에 -3% 이상 급락하면 하락 추세 진입 가능성이 높다.
  if (priceChangeRate <= -3) {
    return {
      status: '과열/하락 경고',
      isRecommend: false,
      reason:
        `당일 주가가 ${priceChangeRate.toFixed(1)}% 급락했습니다. ` +
        `단기 하락 추세가 이어질 수 있으므로 신규 매수보다는 관망하고, ` +
        `보유 중이라면 손절 라인을 점검하세요.`,
    };
  }
  // 하루에 +10% 이상 급등하거나 거래량이 400% 이상 폭발하면
  // 이미 많은 사람이 사서 상투일 가능성이 높다.
  if (priceChangeRate >= 10) {
    return {
      status: '과열/하락 경고',
      isRecommend: false,
      reason:
        `당일 주가가 ${priceChangeRate.toFixed(1)}% 급등해 단기 과열 구간입니다. ` +
        `이런 급등 이후엔 차익 실현 매물이 쏟아지며 조정이 올 수 있으므로, ` +
        `지금 추격 매수는 위험합니다. 눌림목(주가가 일시적으로 내려오는 구간)을 기다리세요.`,
    };
  }
  if (volumeRatio >= 400) {
    return {
      status: '과열/하락 경고',
      isRecommend: false,
      reason:
        `거래량이 전일 대비 ${volumeRatio.toFixed(0)}%로 극도로 폭발했습니다. ` +
        `단기 세력이 물량을 털어내는 구간일 수 있어 추격 매수는 위험합니다. ` +
        `거래량이 안정된 이후 재진입 타이밍을 노리세요.`,
    };
  }

  // ── 조건 A: 이상적 스윙 진입 구간 ──────────────────────────────
  // 세 가지 수치가 모두 "딱 좋은" 범위에 들어온 경우.
  // +1.5%~+6.0%: 너무 작지도, 너무 크지도 않은 상승 / 150%~300%: 적당한 거래량 폭발
  // 외국인 3일 이상 연속 매수: 큰손이 꾸준히 담고 있다는 신호
  const isSwingEntry =
    priceChangeRate >= 1.5 &&
    priceChangeRate <= 6.0 &&
    volumeRatio >= 150 &&
    volumeRatio <= 300 &&
    consecutiveForeignBuyDays >= 3;

  if (isSwingEntry) {
    const hasBullishCandle =
      candlePatternCategory === '상승 전환형' ||
      candlePatternCategory === '추세 반전형';

    const candleBoost = hasBullishCandle
      ? ` 여기에 ${patternLabel}까지 포착되어, 완벽한 스윙 타점 및 상승 캔들 포착입니다! ` +
        `지금이 스윙 매매 진입을 진지하게 고려할 수 있는 가장 강력한 신호입니다.`
      : candlePatternCategory
        ? ` 캔들 패턴(${patternLabel})은 강한 방향성을 보여주진 않지만, 수치 조건이 완벽합니다.`
        : '';

    return {
      status: '스윙 진입',
      isRecommend: true,
      reason:
        `외국인이 ${consecutiveForeignBuyDays}일 연속으로 주식을 사들이고 있고, ` +
        `거래량은 전일 대비 ${volumeRatio.toFixed(0)}%로 활발하며, ` +
        `주가는 ${priceChangeRate >= 0 ? '+' : ''}${priceChangeRate.toFixed(1)}% 움직였습니다.` +
        candleBoost,
    };
  }

  // ── 조건 C: 관심 집중 ───────────────────────────────────────────
  // 수치는 약간 모자라지만 주목할 만한 움직임이 있는 경우.
  // 좋은 캔들 패턴이 함께 나오면 향후 상승 가능성을 높게 본다.
  const isWatchPositive =
    priceChangeRate >= 1.0 &&
    priceChangeRate <= 3.0 &&
    volumeRatio >= 100 &&
    volumeRatio < 150 &&
    consecutiveForeignBuyDays >= 2;

  const hasPositiveCandle =
    candlePatternCategory === '상승 전환형' ||
    candlePatternCategory === '추세 지속형';

  // 수치 조건 충족 or (수치가 어느 정도 + 좋은 캔들)
  const candleAssistedWatch =
    priceChangeRate >= 0.5 &&
    volumeRatio >= 80 &&
    consecutiveForeignBuyDays >= 1 &&
    hasPositiveCandle;

  if (isWatchPositive || candleAssistedWatch) {
    const candleNote = hasPositiveCandle
      ? ` 특히 ${patternLabel}이 나타나 향후 추가 상승 가능성을 높게 봅니다.`
      : '';

    return {
      status: '관심 집중',
      isRecommend: false,
      reason:
        `외국인이 ${consecutiveForeignBuyDays}일 연속 매수 중이고 ` +
        `거래량(${volumeRatio.toFixed(0)}%)·주가(${priceChangeRate >= 0 ? '+' : ''}${priceChangeRate.toFixed(1)}%) 모두 긍정적입니다. ` +
        `스윙 진입 조건을 완전히 충족하진 않았지만 관심 목록에 넣고 지켜볼 만합니다.` +
        candleNote,
    };
  }

  // ── 조건 D: 조건 대기 ─────────────────────────────────────────────
  // 뚜렷한 진입 신호가 없거나, 캔들에 방향성이 없는 경우.
  const noSignalNote =
    candlePatternCategory === '단일 캔들 패턴'
      ? ` 캔들 패턴(${patternLabel})도 방향성이 불명확합니다.`
      : '';

  return {
    status: '조건 대기',
    isRecommend: false,
    reason:
      `현재 스윙 진입 또는 관심 집중 조건을 충족하지 못했습니다. ` +
      `외국인 연속 매수 ${consecutiveForeignBuyDays}일, ` +
      `거래량 ${volumeRatio.toFixed(0)}%, ` +
      `주가 등락률 ${priceChangeRate >= 0 ? '+' : ''}${priceChangeRate.toFixed(1)}%.` +
      noSignalNote +
      ` 조건이 갖춰질 때까지 관망하며 기회를 기다리세요.`,
  };
}
