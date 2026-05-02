# imGoingToMars

한국 주식 스윙 투자 보조 플랫폼. 외인 순매수 흐름과 거래량·주가 돌파를 조합해 매수/매도 신호를 자동 탐지한다.

**서비스 URL**: https://swingingtogether.vercel.app/

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS 11, TypeScript |
| Frontend | React 19, Vite, Tailwind CSS, Recharts |
| Database | PostgreSQL 16, TypeORM |
| 인증 | Google OAuth 2.0, JWT |
| 데이터 소스 | 한국투자증권 OpenAPI (KIS) |
| AI 분석 | Groq LLM |
| 인프라 | Docker, Render |

---

## 핵심 기능

### Entry 신호 (불타기)
아래 세 조건을 동시에 충족할 때만 신호를 발생시킨다.

- 외인 순매수 **5~10 거래일 연속** 양수
- 당일 거래량 ≥ 전일 거래량 × **200%**
- 주가가 전고점 대비 **+2%~+7%** 구간 진입

### Exit 신호 (손절 방어선)
최근 10~15 거래일 캔들에서 이상치 꼬리(하위 5% 이상 이탈)를 제거한 **몸통 저점의 최빈 지지대**를 방어선으로 설정. 종가 또는 장중 가격이 방어선 아래로 확정되면 Exit 신호 발생.

### 그 외
- KRX 종목 마스터 자동 동기화 (매일 새벽 2시)
- 일봉 OHLCV + 외인 순매수 일괄 수집 (KIS API)
- PBR/PER 수집 및 저장 (참고용)
- Google 로그인 기반 개인 종목 관리
- AI(Groq) 차트·공시 분석

---

## 프로젝트 구조

```
.
├── backend/
│   └── src/
│       ├── auth/            # Google OAuth + JWT
│       ├── stock/           # 종목 CRUD
│       ├── stock-master/    # KRX 종목 마스터 동기화
│       ├── price/           # 일봉 OHLCV
│       ├── signal/          # Entry/Exit 신호
│       ├── valuation/       # PBR/PER
│       ├── data-sync/       # KIS 어댑터 + Cron 수집 태스크
│       ├── analysis/        # Groq LLM 분석
│       └── common/          # 유틸, 필터, 인터셉터
└── frontend/
    └── src/
        ├── components/      # Login, StockAnalysis, 차트 등
        └── api/             # 백엔드 API 호출
```

---

## 로컬 실행

### 사전 요구사항
- Docker & Docker Compose
- Node.js 20+

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일에 아래 항목 입력
```

| 변수 | 설명 |
|------|------|
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | PostgreSQL 연결 정보 |
| `KIS_BASE_URL` / `KIS_APP_KEY` / `KIS_APP_SECRET` | 한국투자증권 OpenAPI 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 앱 자격증명 |
| `JWT_SECRET` | JWT 서명 키 |
| `GROQ_API_KEY` | Groq LLM API 키 |
| `BACKEND_URL` | 백엔드 베이스 URL (기본 `http://localhost:3000`) |
| `FRONTEND_URL` | 프론트엔드 URL (기본 `http://localhost:5173`) |

### 2. Docker Compose로 실행

```bash
docker-compose up -d
```

백엔드: `http://localhost:3000`  
프론트엔드: `http://localhost:5173`

### 3. 개별 실행 (개발)

```bash
# 백엔드
cd backend
npm install
npm run start:dev

# 프론트엔드
cd frontend
npm install
npm run dev
```

---

## API 주요 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/stocks` | 내 종목 목록 |
| `POST` | `/stocks` | 종목 추가 |
| `DELETE` | `/stocks/:ticker` | 종목 삭제 |
| `GET` | `/stocks/:ticker/prices` | 일봉 OHLCV (`?from=&to=`) |
| `GET` | `/stocks/:ticker/signals` | 매매 신호 목록 |
| `GET` | `/stock-master/search` | 종목 검색 (`?q=`) |
| `GET` | `/auth/google` | Google 로그인 시작 |

응답 형식: `{ data, meta }`

---

## 데이터 수집 스케줄

| 태스크 | 스케줄 | 설명 |
|--------|--------|------|
| KRX 종목 동기화 | 매일 02:00 (KST) | KOSPI/KOSDAQ 종목 마스터 갱신 |
| 일봉 수집 | 평일 18:00 | 장 마감 후 OHLCV 수집 |
| 외인 순매수 수집 | 평일 18:30 | 외인 데이터 공개 후 수집 |
| 밸류에이션 수집 | 매주 월요일 08:00 | PBR/PER 갱신 |
| 신호 탐지 | 평일 19:00 | 수집 완료 후 Entry/Exit 판별 |

---

## CI

`main` 브랜치 push 또는 PR 시 자동 실행:

```
lint → test → build
```
