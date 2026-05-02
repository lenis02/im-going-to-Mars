import Groq from 'groq-sdk';

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

const FALLBACK: PatternResult = { patternName: '식별된 패턴 없음', category: null };

const VALID_CATEGORIES: CandleCategory[] = [
  '상승 전환형',
  '하락 전환형',
  '단일 캔들 패턴',
  '추세 지속형',
  '추세 반전형',
];

// 09:00 ~ 15:30 장 중 (분 단위)
const MARKET_OPEN = 9 * 60;
const MARKET_CLOSE = 15 * 60 + 30;

function getSeoulDateInfo(): { date: string; totalMinutes: number } {
  // sv-SE locale은 "YYYY-MM-DD HH:MM:SS" 형식을 반환
  const seoulStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
  const [datePart, timePart] = seoulStr.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  return { date: datePart, totalMinutes: hours * 60 + minutes };
}

function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+09:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export class CandlePatternDetector {
  private readonly groq: Groq;
  private readonly cache = new Map<string, PatternResult>();

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY 환경변수가 설정되지 않았습니다.');
    this.groq = new Groq({ apiKey });
  }

  // 장 중이면 null(캐시 무시), 그 외에는 날짜 기반 키 반환
  private getCacheKey(last5: Price[]): string | null {
    const { date, totalMinutes } = getSeoulDateInfo();

    if (totalMinutes >= MARKET_OPEN && totalMinutes < MARKET_CLOSE) {
      return null; // 장 중: 캐시 미사용
    }

    // 09:00 이전이면 전날 마감 기준, 15:30 이후면 당일 기준
    const dateKey = totalMinutes < MARKET_OPEN ? prevDay(date) : date;
    return `${dateKey}:${JSON.stringify(last5)}`;
  }

  async detectPattern(recentData: Price[]): Promise<PatternResult> {
    if (recentData.length === 0) {
      return { patternName: '데이터 없음', category: null };
    }

    const last5 = recentData.slice(-5);
    const cacheKey = this.getCacheKey(last5);

    if (cacheKey !== null) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('[CandlePattern] cache hit:', cacheKey);
        return cached;
      }
    } else {
      console.log('[CandlePattern] 장 중 — 캐시 무시, Groq 호출');
    }

    const candleText = last5
      .map(
        (c, i) =>
          `Day${i + 1}: open=${c.open}, high=${c.high}, low=${c.low}, close=${c.close}`,
      )
      .join('\n');

    const prompt = `다음은 최근 ${last5.length}개의 OHLC 캔들 데이터입니다 (오래된 순서).
${candleText}

이 데이터를 분석하여 가장 최근 캔들 기준으로 캔들스틱 패턴을 하나만 식별하세요.

반드시 아래 패턴 목록 중 하나로만 답하세요. 목록에 없는 패턴명은 절대 사용하지 마세요.

[패턴 목록]
상승 전환형: 망치형, 역망치형, 상승 장악형, 관통형, 샛별형, 샛별 도지형, 적삼병, 잠자리형 도지, 트위저 바텀
하락 전환형: 교수형, 유성형, 하락 장악형, 먹구름형, 석별형, 석별 도지형, 흑삼병, 비석형 도지, 트위저 탑
추세 반전형: 상승 잉태형, 하락 잉태형, 상승 잉태 십자형, 하락 잉태 십자형
추세 지속형: 상승 마루보주, 하락 마루보주, 하락 타스키 갭
단일 캔들 패턴: 십자형

위 목록에 해당하는 패턴이 없으면 patternName을 "식별된 패턴 없음", category를 null로 하세요.

반드시 아래 JSON 형식으로만 응답하세요. 마크다운이나 다른 텍스트는 절대 포함하지 마세요.
{"patternName": "패턴명", "category": "카테고리"}

category는 반드시 다음 중 하나이거나 null이어야 합니다:
"상승 전환형", "하락 전환형", "단일 캔들 패턴", "추세 지속형", "추세 반전형"`;

    console.log('[CandlePattern] prompt:\n', prompt);

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? '';
      console.log('[CandlePattern] raw response:', raw);

      const jsonStr = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      const parsed = JSON.parse(jsonStr) as {
        patternName: unknown;
        category: unknown;
      };
      console.log('[CandlePattern] parsed:', parsed);

      if (typeof parsed.patternName !== 'string') return FALLBACK;

      const category = VALID_CATEGORIES.includes(parsed.category as CandleCategory)
        ? (parsed.category as CandleCategory)
        : null;

      const result: PatternResult = { patternName: parsed.patternName, category };

      if (cacheKey !== null) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (e) {
      console.log('[CandlePattern] error:', e instanceof Error ? e.message : String(e));
      return FALLBACK;
    }
  }
}
