/**
 * 캔들 패턴 탐지 유틸리티
 *
 * technicalindicators 라이브러리(23개) + 커스텀 구현(5개) = 총 28개 패턴 커버
 * 여러 패턴이 동시에 감지될 경우 CATEGORY_PRIORITY 기준으로 가장 강한 신호를 반환한다.
 */

// 1. [수정됨] 모든 패턴을 소문자 함수형 래퍼로 통일하여 import 하고, 누락된 upsidetasukigap 추가
import {
  bullishengulfingpattern,
  bearishengulfingpattern,
  bullishharami,
  bearishharami,
  bullishharamicross,
  bearishharamicross,
  hammerpattern,
  bullishinvertedhammerstick,
  hangingmanunconfirmed,
  shootingstarunconfirmed,
  morningstar,
  eveningstar,
  morningdojistar,
  eveningdojistar,
  threewhitesoldiers,
  threeblackcrows,
  bullishmarubozu,
  bearishmarubozu,
  piercingline,
  darkcloudcover,
  downsidetasukigap,
} from 'technicalindicators';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

/** 캔들 하나의 OHLC 데이터 */
export interface Price {
  open: number;
  high: number;
  low: number;
  close: number;
}

export type CandleCategory =
  | '상승 전환형'
  | '하락 전환형'
  | '단일 캔들 패턴'
  | '추세 지속형'
  | '추세 반전형';

export interface PatternResult {
  patternName: string;
  category: CandleCategory | null;
}

// ─────────────────────────────────────────────
// 카테고리 우선순위
// ─────────────────────────────────────────────

const CATEGORY_PRIORITY: Record<CandleCategory, number> = {
  '하락 전환형': 50,
  '상승 전환형': 40,
  '추세 반전형': 30,
  '추세 지속형': 20,
  '단일 캔들 패턴': 10,
};

// ─────────────────────────────────────────────
// technicalindicators 라이브러리 패턴 정의
// ─────────────────────────────────────────────

// 2. [수정됨] checker 타입을 클래스가 아닌 소문자 함수 자체로 변경
interface LibraryPatternDef {
  patternName: string;
  category: CandleCategory;
  checker: (input: {
    open: number[];
    high: number[];
    close: number[];
    low: number[];
  }) => boolean;
  minCandles: number;
}

// 3. [수정됨] checker 매핑을 전부 import 해온 소문자 함수로 교체
const LIBRARY_PATTERNS: LibraryPatternDef[] = [
  // ── 상승 전환형 (6개) ─────────────────────────────────────────
  { patternName: '상승 장악형', category: '상승 전환형', checker: bullishengulfingpattern, minCandles: 2 },
  { patternName: '역망치형', category: '상승 전환형', checker: bullishinvertedhammerstick, minCandles: 1 },
  { patternName: '관통형', category: '상승 전환형', checker: piercingline, minCandles: 2 },
  { patternName: '샛별형', category: '상승 전환형', checker: morningstar, minCandles: 3 },
  { patternName: '샛별 도지형', category: '상승 전환형', checker: morningdojistar, minCandles: 3 },
  { patternName: '적삼병', category: '상승 전환형', checker: threewhitesoldiers, minCandles: 3 },

  // ── 하락 전환형 (8개) ─────────────────────────────────────────
  { patternName: '하락 장악형', category: '하락 전환형', checker: bearishengulfingpattern, minCandles: 2 },
  { patternName: '교수형', category: '하락 전환형', checker: hangingmanunconfirmed, minCandles: 1 },
  { patternName: '유성형', category: '하락 전환형', checker: shootingstarunconfirmed, minCandles: 1 },
  { patternName: '먹구름형', category: '하락 전환형', checker: darkcloudcover, minCandles: 2 },
  { patternName: '석별형', category: '하락 전환형', checker: eveningstar, minCandles: 3 },
  { patternName: '석별 도지형', category: '하락 전환형', checker: eveningdojistar, minCandles: 3 },
  { patternName: '흑삼병', category: '하락 전환형', checker: threeblackcrows, minCandles: 3 },

  // ── 추세 반전형 (5개) ─────────────────────────────────────────
  { patternName: '망치형', category: '추세 반전형', checker: hammerpattern, minCandles: 1 },
  { patternName: '상승 잉태형', category: '추세 반전형', checker: bullishharami, minCandles: 2 },
  { patternName: '하락 잉태형', category: '추세 반전형', checker: bearishharami, minCandles: 2 },
  { patternName: '상승 잉태 십자형', category: '추세 반전형', checker: bullishharamicross, minCandles: 2 },
  { patternName: '하락 잉태 십자형', category: '추세 반전형', checker: bearishharamicross, minCandles: 2 },

  // ── 추세 지속형 (4개) ─────────────────────────────────────────
  { patternName: '상승 마루보주', category: '추세 지속형', checker: bullishmarubozu, minCandles: 1 },
  { patternName: '하락 마루보주', category: '추세 지속형', checker: bearishmarubozu, minCandles: 1 },
  { patternName: '하락 타스키 갭', category: '추세 지속형', checker: downsidetasukigap, minCandles: 3 },
];

// ─────────────────────────────────────────────
// 커스텀 패턴 구현 헬퍼
// ─────────────────────────────────────────────

function bodySize(c: Price): number {
  return Math.abs(c.close - c.open);
}

function range(c: Price): number {
  return c.high - c.low;
}

function upperShadow(c: Price): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerShadow(c: Price): number {
  return Math.min(c.open, c.close) - c.low;
}

function isDoji(c: Price): boolean {
  const r = range(c);
  if (r === 0) return true;
  return bodySize(c) / r <= 0.05;
}

function isGravestoneDoji(c: Price): boolean {
  if (!isDoji(c)) return false;
  const r = range(c);
  if (r === 0) return false;
  return upperShadow(c) / r >= 0.67 && lowerShadow(c) / r <= 0.1;
}

function isDragonflyDoji(c: Price): boolean {
  if (!isDoji(c)) return false;
  const r = range(c);
  if (r === 0) return false;
  return lowerShadow(c) / r >= 0.67 && upperShadow(c) / r <= 0.1;
}

function isTweezerBottom(prev: Price, curr: Price): boolean {
  if (prev.close >= prev.open) return false;
  if (curr.close <= curr.open) return false;
  const avgLow = (prev.low + curr.low) / 2;
  if (avgLow === 0) return false;
  return Math.abs(prev.low - curr.low) / avgLow <= 0.002;
}

function isTweezerTop(prev: Price, curr: Price): boolean {
  if (prev.close <= prev.open) return false;
  if (curr.close >= curr.open) return false;
  const avgHigh = (prev.high + curr.high) / 2;
  if (avgHigh === 0) return false;
  return Math.abs(prev.high - curr.high) / avgHigh <= 0.002;
}

// ─────────────────────────────────────────────
// CandlePatternDetector 클래스
// ─────────────────────────────────────────────

export class CandlePatternDetector {
  public detectPattern(recentData: Price[]): PatternResult {
    if (recentData.length === 0) {
      return { patternName: '데이터 없음', category: null };
    }

    const detected: Array<{ patternName: string; category: CandleCategory }> = [];

    for (const def of LIBRARY_PATTERNS) {
      if (recentData.length < def.minCandles) continue;

      try {
        const sliced = recentData;
        const ohlc = {
          open: sliced.map(d => d.open),
          high: sliced.map(d => d.high),
          low: sliced.map(d => d.low),
          close: sliced.map(d => d.close),
        };

        if (def.checker(ohlc)) {
          detected.push({ patternName: def.patternName, category: def.category });
        }
      } catch {
        console.error(`[Pattern Error] ${def.patternName}`);
      }
    }

    const curr = recentData[recentData.length - 1];
    const prev = recentData.length >= 2 ? recentData[recentData.length - 2] : null;

    if (isGravestoneDoji(curr)) {
      detected.push({ patternName: '비석형 도지', category: '하락 전환형' });
    } else if (isDragonflyDoji(curr)) {
      detected.push({ patternName: '잠자리형 도지', category: '상승 전환형' });
    } else if (isDoji(curr)) {
      detected.push({ patternName: '십자형', category: '단일 캔들 패턴' });
    }

    if (prev) {
      if (isTweezerBottom(prev, curr)) {
        detected.push({ patternName: '트위저 바텀', category: '추세 반전형' });
      }
      if (isTweezerTop(prev, curr)) {
        detected.push({ patternName: '트위저 탑', category: '추세 반전형' });
      }
    }

    if (detected.length === 0) {
      return { patternName: '식별된 패턴 없음', category: null };
    }

    detected.sort(
      (a, b) => CATEGORY_PRIORITY[b.category] - CATEGORY_PRIORITY[a.category],
    );

    const winner = detected[0];
    return { patternName: winner.patternName, category: winner.category };
  }
}