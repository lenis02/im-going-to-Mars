import { useEffect, useRef, useState } from 'react'
import { fetchCurrentQuote, fetchPrices, fetchSignal, fetchStocks } from '../api/stock'
import type { CurrentQuote, DailyPrice, Stock, StockSignal } from '../api/stock'

interface Props {
  ticker: string
  refreshKey?: number
}

function calcRolling7(prices: DailyPrice[]) {
  const sorted = [...prices]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ ...p, foreignNetBuy: Number(p.foreignNetBuy) }))

  return sorted.map((p, i) => {
    const window = sorted.slice(Math.max(0, i - 6), i + 1)
    const sum = window.reduce((acc, d) => acc + d.foreignNetBuy, 0)
    return { date: p.date.slice(5), sum }
  })
}

interface CandleEntry {
  date: string
  open: number
  high: number
  low: number
  close: number
}

function CandlestickSVGChart({
  data,
  domain,
  width = 0,
  height = 0,
}: {
  data: CandleEntry[]
  domain: [number, number]
  width?: number
  height?: number
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const margin = { top: 4, right: 8, bottom: 20, left: 36 }
  const plotW = Math.max(width - margin.left - margin.right, 0)
  const plotH = Math.max(height - margin.top - margin.bottom, 0)
  const [yMin, yMax] = domain
  const n = data.length
  const bandwidth = n > 0 ? plotW / n : 0
  const xPos = (i: number) => margin.left + (i + 0.5) * bandwidth
  const yPos = (v: number) =>
    yMax === yMin ? margin.top + plotH / 2 : margin.top + plotH * (1 - (v - yMin) / (yMax - yMin))

  const yTicks = Array.from({ length: 4 }, (_, i) => yMin + (yMax - yMin) * (i / 3))
  const xLabelIndices = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1]

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const idx = Math.floor((e.clientX - rect.left - margin.left) / bandwidth)
    setHoverIdx(idx >= 0 && idx < n ? idx : null)
  }

  const hd = hoverIdx !== null ? data[hoverIdx] : null

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={margin.left} y1={yPos(v)} x2={margin.left + plotW} y2={yPos(v)} stroke="#262626" strokeWidth={0.5} />
            <text x={margin.left - 4} y={yPos(v) + 3} textAnchor="end" fontSize={10} fill="#a3a3a3">
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {xLabelIndices.map((i) => (
          <text key={i} x={xPos(i)} y={height - 5} textAnchor="middle" fontSize={10} fill="#a3a3a3">
            {data[i]?.date}
          </text>
        ))}
        {data.map((d, i) => {
          const cx = xPos(i)
          const isUp = d.close >= d.open
          const color = isUp ? '#ef4444' : '#3b82f6'
          const bodyTop = Math.min(yPos(d.open), yPos(d.close))
          const bodyH = Math.max(Math.abs(yPos(d.close) - yPos(d.open)), 1)
          const bodyW = Math.max(bandwidth * 0.6 - 1, 1)
          return (
            <g key={i}>
              <line x1={cx} y1={yPos(d.high)} x2={cx} y2={yPos(d.low)} stroke={color} strokeWidth={1} />
              <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} />
            </g>
          )
        })}
        {hoverIdx !== null && (
          <line x1={xPos(hoverIdx)} y1={margin.top} x2={xPos(hoverIdx)} y2={margin.top + plotH}
            stroke="#525252" strokeWidth={0.5} strokeDasharray="3,3" />
        )}
      </svg>
      {hd && hoverIdx !== null && (
        <div
          style={{ position: 'absolute', left: Math.min(xPos(hoverIdx) + 8, width - 110), top: margin.top, pointerEvents: 'none' }}
          className="bg-[#1c1c1c] border border-[#262626] rounded-sm px-3 py-2 text-xs z-10"
        >
          <p className="text-[#a3a3a3] mb-1">{hd.date}</p>
          <p className="text-[#e5e5e5]">시&nbsp;<span className="font-mono">{hd.open.toLocaleString()}</span></p>
          <p className="text-[#e5e5e5]">고&nbsp;<span className="font-mono">{hd.high.toLocaleString()}</span></p>
          <p className="text-[#e5e5e5]">저&nbsp;<span className="font-mono">{hd.low.toLocaleString()}</span></p>
          <p className={`font-mono font-semibold ${hd.close >= hd.open ? 'text-[#ef4444]' : 'text-[#3b82f6]'}`}>종&nbsp;{hd.close.toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}

const VERDICT_CONFIG = {
  entry: { label: '매수 추천', className: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' },
  watch: { label: '관찰 중',   className: 'bg-[#1c1c1c] text-[#a3a3a3] border border-[#333]' },
  exit:  { label: '매수 비추천', className: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30' },
}

const SIGNAL_CONFIG = {
  entry:    { label: '스윙 진입',     text: 'text-[#22c55e]', dot: 'bg-[#22c55e]' },
  exit:     { label: '과열/하락 경고', text: 'text-[#ef4444]', dot: 'bg-[#ef4444]' },
  interest: { label: '관심 집중',     text: 'text-[#f59e0b]', dot: 'bg-[#f59e0b]' },
  watch:    { label: '조건 대기',     text: 'text-[#a3a3a3]', dot: 'bg-[#737373]' },
}

function signalStatusToKey(status: StockSignal['status']): keyof typeof SIGNAL_CONFIG {
  if (status === '스윙 진입') return 'entry'
  if (status === '과열/하락 경고') return 'exit'
  if (status === '관심 집중') return 'interest'
  return 'watch'
}

export default function StockAnalysis({ ticker, refreshKey }: Props) {
  const [prices, setPrices] = useState<DailyPrice[]>([])
  const [stock, setStock] = useState<Stock | null>(null)
  const [quote, setQuote] = useState<CurrentQuote | null>(null)
  const [signal, setSignal] = useState<StockSignal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showConditions, setShowConditions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const candleRef = useRef<HTMLDivElement>(null)
  const [candleW, setCandleW] = useState(0)

  useEffect(() => {
    if (!candleRef.current) return
    const obs = new ResizeObserver(([e]) => setCandleW(e.contentRect.width))
    obs.observe(candleRef.current)
    return () => obs.disconnect()
  }, [loading])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchPrices(ticker), fetchStocks(), fetchCurrentQuote(ticker)])
      .then(([priceData, stocks, quoteData]) => {
        setPrices(priceData)
        setStock(stocks.find((s) => s.ticker === ticker) ?? null)
        setQuote(quoteData)
        return fetchSignal(ticker, quoteData.changeRate)
      })
      .then((signalData) => setSignal(signalData))
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [ticker, refreshKey])

  useEffect(() => {
    const id = setInterval(() => {
      fetchCurrentQuote(ticker).then(setQuote).catch(() => {})
    }, 1_000)
    return () => clearInterval(id)
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-8 text-center text-sm text-[#a3a3a3]">
        분석 중...
      </div>
    )
  }

  if (error || prices.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-8 text-center text-sm text-[#a3a3a3]">
        {error ?? '일봉 데이터가 없습니다. 상단의 일봉 동기화 버튼을 눌러주세요.'}
      </div>
    )
  }

  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))

  let consecutiveForeignBuyDays = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (Number(sorted[i].foreignNetBuy) > 0) consecutiveForeignBuyDays++
    else break
  }
  const latestP = sorted[sorted.length - 1]
  const prevP = sorted[sorted.length - 2]
  const volumeRatioPct = Number(prevP?.volume) > 0
    ? (Number(latestP.volume) / Number(prevP.volume)) * 100
    : 0

  const sigKey = signal ? signalStatusToKey(signal.status) : ('watch' as keyof typeof SIGNAL_CONFIG)
  const sig = SIGNAL_CONFIG[sigKey]
  const verdictKey = sigKey === 'interest' ? 'watch' : sigKey as keyof typeof VERDICT_CONFIG
  const verdictConfig = VERDICT_CONFIG[verdictKey]

  const latestClose = quote?.price ?? Number(latestP.close)
  const latestChangeRate = quote?.changeRate ?? 0
  const isUp = latestChangeRate >= 0
  const changeColor = isUp ? 'text-[#ef4444]' : 'text-[#3b82f6]'

  const candleChartData: CandleEntry[] = sorted.map((p) => ({
    date: p.date.slice(5),
    open: Number(p.open),
    high: Number(p.high),
    low: Number(p.low),
    close: Number(p.close),
  }))
  const candleYDomain = [
    Math.floor(Math.min(...candleChartData.map((d) => d.low)) * 0.998),
    Math.ceil(Math.max(...candleChartData.map((d) => d.high)) * 1.002),
  ]
  const netBuyChartData = calcRolling7(prices)

  return (
    <>
      <div className="bg-[#141414] border border-[#262626] rounded-sm overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-[#22c55e] text-sm">{ticker}</span>
              {stock && <span className="font-semibold text-white">{stock.name}</span>}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-white">{latestClose.toLocaleString()}원</span>
              <span className={`text-sm font-medium font-mono ${changeColor}`}>
                {isUp ? '+' : ''}{latestChangeRate.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-[#a3a3a3] mt-0.5">전일 대비 · 최근 30일 분석</p>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-sm ${verdictConfig.className}`}>
            {verdictConfig.label}
          </span>
        </div>

        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 grid grid-cols-1 sm:grid-cols-10 gap-4 sm:gap-6">
          {/* 캔들차트 */}
          <div className="col-span-1 sm:col-span-7">
            <p className="text-xs font-medium text-[#a3a3a3] mb-2">
              캔들차트 <span className="text-[#a3a3a3] font-normal">(수정주가 기준)</span>
            </p>
            <div ref={candleRef} style={{ height: 160 }}>
              {candleW > 0 && (
                <CandlestickSVGChart data={candleChartData} domain={[candleYDomain[0], candleYDomain[1]]} width={candleW} height={160} />
              )}
            </div>
          </div>

          {/* 분석 결과 + 7일 누적 외인 순매수 */}
          <div className="col-span-1 sm:col-span-3 flex flex-row sm:flex-col justify-around sm:justify-between items-center sm:items-stretch gap-2 sm:gap-1 border-t sm:border-t-0 border-[#262626] pt-4 sm:pt-0">
            {/* 매매 시그널 */}
            <div className="text-center flex-1">
              <p className="text-[10px] text-[#a3a3a3] font-medium mb-1.5 uppercase tracking-wider">매매 시그널</p>
              <button
                onClick={() => signal && setShowModal(true)}
                className="inline-flex flex-col items-center gap-0.5 group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${sig.dot}`} />
                  <span className={`text-lg font-bold ${sig.text} group-hover:underline underline-offset-2`}>
                    {sig.label}
                  </span>
                </div>
                {signal?.patternName && (
                  <p className={`text-[11px] font-medium ${sig.text} opacity-60`}>
                    {signal.patternName}
                  </p>
                )}
              </button>
            </div>

            {/* 7일 누적 외인 순매수 */}
            <div className="flex flex-col items-center gap-1 sm:pb-3 flex-1">
              <p className="text-[10px] font-medium text-[#a3a3a3] uppercase tracking-wider">7일 누적 외인 순매수</p>
              {(() => {
                const latest = netBuyChartData[netBuyChartData.length - 1]
                const sum = latest?.sum ?? 0
                const isPositive = sum >= 0
                return (
                  <span
                    className={`font-bold font-mono tabular-nums text-xl sm:text-[22px] leading-tight ${isPositive ? 'text-[#22c55e]' : 'text-[#3b82f6]'}`}
                  >
                    {isPositive ? '+' : ''}{sum.toLocaleString()}
                  </span>
                )
              })()}
              <p className="text-xs text-[#a3a3a3]">주</p>
            </div>
          </div>
        </div>
      </div>

      {/* 시그널 상세 모달 */}
      {showModal && signal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => { setShowModal(false); setShowConditions(false) }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-[#141414] border border-[#262626] rounded-sm w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-1.5 h-1.5 rounded-sm ${sig.dot}`} />
                <h3 className={`font-bold text-base ${sig.text}`}>{sig.label}</h3>
              </div>
              <button
                onClick={() => { setShowModal(false); setShowConditions(false) }}
                className="text-[#a3a3a3] hover:text-[#e5e5e5] text-lg leading-none cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 수치 항목 */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a3a3a3]">외인 연속 순매수</span>
                <span className={`text-sm font-semibold font-mono tabular-nums ${consecutiveForeignBuyDays >= 3 ? 'text-[#22c55e]' : 'text-[#a3a3a3]'}`}>
                  {consecutiveForeignBuyDays}일 연속
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a3a3a3]">거래량</span>
                <span className={`text-sm font-semibold font-mono tabular-nums ${volumeRatioPct >= 150 ? 'text-[#22c55e]' : 'text-[#a3a3a3]'}`}>
                  전일 대비 {volumeRatioPct.toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a3a3a3]">전일 대비 등락율</span>
                <span className={`text-sm font-semibold font-mono tabular-nums ${latestChangeRate > 0 ? 'text-[#ef4444]' : latestChangeRate < 0 ? 'text-[#3b82f6]' : 'text-[#a3a3a3]'}`}>
                  {latestChangeRate >= 0 ? '+' : ''}{latestChangeRate.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a3a3a3]">캔들 패턴</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#e5e5e5]">
                    {signal.patternName || '식별 없음'}
                  </p>
                  {signal.patternCategory && (
                    <p className="text-[11px] text-[#a3a3a3]">{signal.patternCategory}</p>
                  )}
                </div>
              </div>

              {signal.stopLoss > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a3a3a3]">손절 추천가</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono tabular-nums text-[#ef4444]">
                      {signal.stopLoss.toLocaleString()}원
                    </p>
                    <p className="text-[11px] text-[#a3a3a3]">
                      현재가 대비 {(((signal.stopLoss - latestClose) / latestClose) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 시그널 근거 */}
            <div className="px-5 pb-4 pt-1 border-t border-[#262626]">
              <p className="text-sm text-[#e5e5e5] leading-relaxed">{signal.reason}</p>
            </div>

            {/* 추천 조건 상세 토글 */}
            <div className="border-t border-[#262626]">
              <button
                onClick={() => setShowConditions((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#1c1c1c] transition-colors cursor-pointer"
              >
                <span>추천 조건 상세 보기</span>
                <span className={`transition-transform duration-200 ${showConditions ? 'rotate-180' : ''}`}>▾</span>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${showConditions ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-5 pb-5 space-y-4">

                  <div>
                    <p className="text-[11px] font-bold text-[#22c55e] mb-1.5">스윙 진입 <span className="font-normal text-[#a3a3a3]">(세 조건 모두 충족)</span></p>
                    <div className="space-y-1">
                      {[
                        ['외인 연속 순매수', '3일 이상'],
                        ['거래량', '전일 대비 150% ~ 300%'],
                        ['전일 대비 등락율', '+1.5% ~ +6.0%'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-[11px]">
                          <span className="text-[#a3a3a3]">{label}</span>
                          <span className="text-[#e5e5e5] font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-[#f59e0b] mb-1.5">관심 집중 <span className="font-normal text-[#a3a3a3]">(일부 충족)</span></p>
                    <div className="space-y-1">
                      {[
                        ['외인 연속 순매수', '2일 이상'],
                        ['거래량', '전일 대비 100% ~ 150%'],
                        ['전일 대비 등락율', '+1.0% ~ +3.0%'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-[11px]">
                          <span className="text-[#a3a3a3]">{label}</span>
                          <span className="text-[#e5e5e5] font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-[#ef4444] mb-1.5">과열/하락 경고 <span className="font-normal text-[#a3a3a3]">(하나라도 해당)</span></p>
                    <div className="space-y-1">
                      {[
                        ['하락 전환형 캔들 패턴', '감지 시'],
                        ['전일 대비 등락율', '+10% 이상 또는 -3% 이하'],
                        ['거래량', '전일 대비 400% 이상'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-[11px]">
                          <span className="text-[#a3a3a3]">{label}</span>
                          <span className="text-[#e5e5e5] font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
