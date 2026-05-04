# CLAUDE.md — practice_stock

주식 스윙 투자 보조 도구의 백엔드 및 데이터 파이프라인 개발 가이드.

---

## 1. 프로젝트 개요

- **목적**: 추세 추종 스윙 투자 전략 기반의 매수/매도 신호를 자동으로 탐지·관리하는 웹 서비스 백엔드
- **기술 스택**: Nest.js (TypeScript) · PostgreSQL · TypeORM · Docker
- **인터페이스**: RESTful API (웹 프론트엔드 대상, 모바일 앱 아님)

---

## 2. 핵심 도메인 로직

코드를 작성할 때 아래 세 가지 로직이 시스템의 중심임을 항상 인식해야 한다.

### 2-1. Entry 신호 (불타기)

| 조건 | 기준 |
|------|------|
| 외인 순매수 지속 | 최근 5~10 거래일 연속 양수 |
| 거래량 폭발 | 당일 거래량 ≥ 전일 거래량 × 200% |
| 주가 돌파 | 전고점 대비 +2%~+7% 구간 진입 |

세 조건을 모두 충족할 때만 Entry 신호로 판정한다.

### 2-2. Exit 신호 (2주 저점 방어선)

- **방어선 계산**: 최근 10~15 거래일(약 2~3주) 캔들에서, 특출나게 긴 아래꼬리(하위 5% 이상 이탈 꼬리)를 제외한 **몸통(body) 저점의 최빈 지지 가격대**를 변동성 하단으로 설정
- **손절 트리거**: 종가 또는 장중 가격이 방어선 아래로 확정되면 Exit 신호 발생

### 2-3. 보조 지표 (저평가 레이더)

- PBR, PER 수집 및 저장 (참고용 표시, 신호 로직에는 미개입)
- 향후 섹터 평균 대비 상대 밸류에이션 표시 확장 예정

---

## 3. 폴더 구조

```
src/
├── app.module.ts
├── main.ts
│
├── auth/                          # Google OAuth + JWT 인증
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── guards/
│   │   ├── google-auth.guard.ts
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       ├── google.strategy.ts
│       └── jwt.strategy.ts
│
├── common/                        # 전역 유틸·데코레이터·가드
│   ├── filters/                   # 글로벌 예외 필터
│   ├── interceptors/
│   └── utils/
│       ├── candle.util.ts         # 캔들 몸통/꼬리 계산 함수
│       ├── candle-pattern.util.ts
│       └── signal.util.ts         # Entry/Exit 조건 판별 순수 함수
│
├── config/                        # ConfigModule 설정
│   └── configuration.ts
│
├── database/                      # TypeORM 설정, 마이그레이션
│   └── migrations/
│
├── stock/                         # 종목 마스터
│   ├── stock.module.ts
│   ├── stock.controller.ts        # GET/DELETE/PATCH 전담 (추가는 data-sync에서)
│   ├── stock.service.ts
│   └── entities/
│       └── stock.entity.ts        # ticker, name, userId (market 필드 없음)
│
├── stock-master/                  # KRX 종목 마스터 검색 (ticker 자동완성)
│   ├── stock-master.module.ts
│   ├── stock-master.controller.ts # GET /stock-master/search?q=
│   ├── stock-master.service.ts
│   └── entities/
│       └── stock-master.entity.ts
│
├── price/                         # 일봉 OHLCV + 외인 순매수
│   ├── price.module.ts
│   ├── price.controller.ts
│   ├── price.service.ts
│   └── entities/
│       └── daily-price.entity.ts  # date, open, high, low, close, volume, foreign_net_buy
│
├── signal/                        # Entry/Exit 신호 탐지
│   ├── signal.module.ts
│   ├── signal.controller.ts
│   ├── signal.service.ts          # 핵심 신호 판별 로직
│   └── entities/
│       └── signal.entity.ts       # type(ENTRY/EXIT), triggered_at, price, reason
│
├── valuation/                     # PBR, PER 저장
│   ├── valuation.module.ts
│   ├── valuation.controller.ts
│   ├── valuation.service.ts
│   └── entities/
│       └── valuation.entity.ts
│
├── data-sync/                     # 외부 데이터 수집 파이프라인
│   ├── data-sync.module.ts
│   ├── data-sync.controller.ts    # POST /data-sync/stocks (종목 추가+sync 통합)
│   ├── tasks/
│   │   ├── price-sync.task.ts     # @Cron: 일봉 OHLCV + 외인 순매수 동시 수집
│   │   └── signal-detect.task.ts  # @Cron: 신호 탐지 실행
│   └── adapters/                  # 증권사 API 추상화
│       ├── market-data.port.ts    # 인터페이스 (Port)
│       └── kis/                   # 한국투자증권 OpenAPI 구현체
│           ├── kis-adapter.ts
│           ├── kis-auth.service.ts
│           └── kis.types.ts
│
└── analysis/                      # LLM 분석 확장 영역 (stub)
    ├── analysis.module.ts
    ├── analysis.service.ts
    └── providers/
        └── llm.provider.ts
```

---

## 4. TypeORM 사용 원칙

### 4-1. 마이그레이션 필수 사용

```bash
# synchronize: true 는 개발 초기에만 허용, 운영 환경에서는 반드시 false
TypeOrmModule.forRoot({
  synchronize: process.env.NODE_ENV !== 'production',
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: true,
})
```

### 4-2. 대량 Upsert 패턴

일봉 데이터처럼 매일 N개 종목을 동기화할 때는 개별 `save()`를 루프 돌리지 말고 배치 upsert를 사용한다.

```typescript
await this.dataSource
  .createQueryBuilder()
  .insert()
  .into(DailyPrice)
  .values(rows)
  .orUpdate(['open', 'high', 'low', 'close', 'volume', 'foreign_net_buy'], ['stock_id', 'date'])
  .execute();
```

### 4-3. 엔티티 설계 규칙

- 복합 유니크 제약은 `@Unique(['stock', 'date'])` 데코레이터로 명시
- 날짜 컬럼은 `@Column({ type: 'date' })`으로 지정 (timestamp 혼용 금지)
- 금액·비율은 `numeric(18, 4)` 타입 사용 (`float` 부동소수점 오류 방지)
- 외래키 관계에서 `eager: true`는 사용하지 않음 (N+1 방지를 위해 QueryBuilder로 명시 join)

### 4-4. 트랜잭션

신호 감지 후 DB 저장은 반드시 트랜잭션으로 묶는다.

```typescript
await this.dataSource.transaction(async (manager) => {
  // 신호 저장 + 관련 메타데이터 저장을 원자적으로 처리
});
```

---

## 5. 데이터 수집 파이프라인 원칙

### 5-1. Adapter 패턴으로 소스 추상화

`market-data.port.ts`에 인터페이스를 정의하고 구현체(KIS, 크롤러 등)를 교체 가능하게 유지한다.

```typescript
export interface MarketDataPort {
  fetchDailyPrices(ticker: string, from: Date, to: Date): Promise<OhlcvDto[]>;
  fetchInvestorTradeDailyByStock(ticker: string, from: Date, to: Date): Promise<DailyInvestorDto[]>;
  fetchCurrentPrice(ticker: string): Promise<CurrentPriceDto>;
}
```

- `fetchInvestorTradeDailyByStock`: J(KOSPI)/Q(KOSDAQ) 순서로 시도, 빈 응답 시 `[]` 반환 (throw 금지)
- `fetchDailyPrices`: `FID_COND_MRKT_DIV_CODE: 'J'`로 고정 (KOSPI/KOSDAQ 모두 처리됨)

### 5-2. Cron 스케줄 기준

| Task | 스케줄 | 비고 |
|------|--------|------|
| price-sync | `0 18 * * 1-5` | 일봉 OHLCV + 외인 순매수 동시 수집 |
| signal-detect | `0 19 * * 1-5` | 수집 완료 후 신호 탐지 |

### 5-3. 수집 실패 처리

- 개별 종목 수집 실패 시 전체 배치를 중단하지 않고 로그 후 다음 종목 진행
- 실패 목록을 별도 테이블(`sync_error_log`)에 기록하여 수동 재시도 가능하게 구성

---

## 6. API 설계 규칙

- RESTful 리소스 중심 설계: `/stocks`, `/stocks/:ticker/signals`, `/stocks/:ticker/prices`
- 응답은 `{ data, meta }` 래퍼 구조 통일
- 날짜 파라미터는 `YYYY-MM-DD` 형식으로 통일 (ISO 8601)
- 페이지네이션: cursor 기반 (`?cursor=&limit=`) 우선 고려 (일봉 데이터 양이 많을 수 있음)
- 에러 응답은 Nest.js 글로벌 예외 필터에서 `{ statusCode, message, timestamp }` 형식으로 통일
- 모든 엔드포인트는 `JwtAuthGuard`로 보호 (auth 관련 엔드포인트 제외)

### 6-1. 주요 엔드포인트 (실제 구현 기준)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/data-sync/stocks` | **종목 추가 + 즉시 sync** (프론트에서 종목 추가 시 이 엔드포인트 사용) |
| GET | `/stocks` | 내 종목 목록 |
| DELETE | `/stocks/:ticker` | 종목 삭제 |
| GET | `/stocks/ranking/foreign` | 외인 순매수 랭킹 |
| GET | `/stocks/:ticker/prices` | 일봉 OHLCV + 외인 데이터 |
| POST | `/data-sync/prices` | 전체 종목 수동 sync |
| GET | `/data-sync/lookup/:ticker` | KIS API로 종목명 조회 |
| GET | `/data-sync/quote/:ticker` | 현재가 조회 |
| GET | `/stock-master/search?q=` | 종목 마스터 검색 (자동완성) |

---

## 7. 차트 뷰 전환 설계

사용자는 버튼 클릭으로 **캔들차트 ↔ 라인차트**를 전환할 수 있어야 한다.

### 7-1. API 지원 요건

차트 타입 전환은 클라이언트 렌더링 전환이지만, 백엔드는 두 뷰 모두에 필요한 데이터를 단일 엔드포인트로 제공한다.

- **캔들차트**: `open`, `high`, `low`, `close`, `volume` 모두 필요
- **라인차트**: `close`(종가) 만 사용하지만, 동일 엔드포인트 응답을 재활용
- 별도의 `/prices/line`, `/prices/candle` 엔드포인트를 만들지 않는다.

```
GET /stocks/:ticker/prices?from=YYYY-MM-DD&to=YYYY-MM-DD
```

응답 예시:
```json
{
  "data": [
    {
      "date": "2024-01-02",
      "open": 71000,
      "high": 73500,
      "low": 70500,
      "close": 73000,
      "volume": 1240000,
      "foreignNetBuy": 52000
    }
  ],
  "meta": { "ticker": "005930", "count": 60 }
}
```

### 7-2. 프론트엔드 연동 규칙

- 차트 타입 상태(`chartType: 'candle' | 'line'`)는 클라이언트가 관리 — 서버에 저장하지 않음
- 동일 API 응답 데이터를 라이브러리(예: lightweight-charts, recharts)에 넘길 때 뷰 타입에 따라 필드를 선택적으로 사용
- 전환 버튼은 데이터를 재요청하지 않고 동일 데이터로 렌더링 방식만 변경

---

## 8. 신호 탐지 로직 구현 원칙

- Entry·Exit 판별 순수 함수는 `common/utils/signal.util.ts`에 위치 (Service 로직과 분리)
- 신호 판별 함수는 DB 접근 없이 DTO 배열만 인자로 받아 결과를 반환 (테스트 용이성)
- Exit 방어선 계산 시 이상치 꼬리 제거 기준: `꼬리 길이 > 몸통 길이 × 2` 이상인 캔들의 저가는 제외

```typescript
// 예시 시그니처
function calcSupportFloor(candles: CandleDto[], lookback: number): number

function isEntrySignal(prices: DailyPriceDto[], foreignNetBuys: number[]): boolean

function isExitSignal(currentPrice: number, supportFloor: number): boolean
```

---

## 9. 확장 설계 (LLM 분석)

`analysis/` 모듈은 초기에 stub으로만 유지하되, 다음 인터페이스를 미리 정의해 둔다.

```typescript
export interface LlmProvider {
  analyzeChart(imageBase64: string, context: string): Promise<string>;
  analyzeDisclosure(text: string): Promise<string>;
}
```

- LLM 호출은 `analysis/` 모듈 밖으로 노출하지 않음
- 외부 LLM API 키는 ConfigModule + 환경변수로 관리 (코드에 하드코딩 금지)
- 분석 결과는 별도 `analysis_result` 테이블에 저장하여 신호 엔티티와 연관

---

## 10. 환경 변수 관리

`.env` 파일은 커밋하지 않는다. 아래 변수를 `.env.example`에 명시한다.

```
NODE_ENV=development

# 로컬 개발: 아래 개별 항목 사용
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=practice_stock

# 배포(Neon 등): DATABASE_URL 하나로 대체 가능
DATABASE_URL=

KIS_BASE_URL=https://openapi.koreainvestment.com:9443
KIS_APP_KEY=
KIS_APP_SECRET=

LLM_API_KEY=
GROQ_API_KEY=

# 프론트엔드 배포 URL (CORS 허용)
CORS_ORIGIN=https://your-app.vercel.app
```

---

## 11. Docker 구성 원칙

- `docker-compose.yml`: PostgreSQL + 앱 서비스 구성
- 앱 컨테이너는 `wait-for-it` 또는 healthcheck로 DB 준비 확인 후 기동
- 마이그레이션은 앱 기동 시 `migrationsRun: true`로 자동 실행

---

## 12. 코드 스타일 요약

- 파일명: `kebab-case.ts`
- 클래스명: `PascalCase`
- 변수·함수: `camelCase`
- DB 컬럼명: `snake_case`
- 주석은 **WHY가 명확하지 않을 때만** 작성 (WHAT 설명 주석은 금지)
- `any` 타입 사용 금지 — 필요 시 unknown으로 좁히거나 DTO/타입 정의
