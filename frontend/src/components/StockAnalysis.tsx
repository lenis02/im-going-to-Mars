import { useEffect, useRef, useState } from 'react'
import { fetchCurrentQuote, fetchPrices, fetchStocks } from '../api/stock'
import type { CurrentQuote, DailyPrice, Stock } from '../api/stock'

interface Props {
  ticker: string
}

interface Factor {
  label: string
  met: boolean
  detail: string
}

function calcFactors(prices: DailyPrice[]): { factors: Factor[]; verdict: 'entry' | 'watch' | 'exit' } {
  if (prices.length < 2) return { factors: [], verdict: 'watch' }

  const sorted = [...prices]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ ...p, close: Number(p.close), volume: Number(p.volume), foreignNetBuy: Number(p.foreignNetBuy) }))

  const latest = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]

  // 1. 외인 연속 순매수
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].foreignNetBuy > 0) streak++
    else break
  }

  // 2. 거래량 폭발
  const volumeRatio = prev.volume > 0 ? latest.volume / prev.volume : 0

  // 3. 전일 대비 2~7% 상승 (KIS 기준가 기반 changeRate 사용)
  const changeRate = Number(latest.changeRate)
  const priceRise = changeRate >= 2 && changeRate <= 7

  const factors: Factor[] = [
    {
      label: '외인 연속 순매수',
      met: streak >= 5,
      detail: `${streak}일째 연속 (기준: 5일 이상)`,
    },
    {
      label: '거래량 폭발',
      met: volumeRatio >= 2,
      detail: `전일 대비 ${(volumeRatio * 100).toFixed(0)}% (기준: 200% 이상)`,
    },
    {
      label: '전일 대비 2~7% 상승',
      met: priceRise,
      detail: `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(2)}% (기준: +2%~+7%)`,
    },
  ]

  const metCount = factors.filter((f) => f.met).length
  const verdict = metCount === 3 ? 'entry' : metCount === 0 ? 'exit' : 'watch'
  return { factors, verdict }
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
            <line x1={margin.left} y1={yPos(v)} x2={margin.left + plotW} y2={yPos(v)} stroke="#f3f4f6" strokeWidth={0.5} />
            <text x={margin.left - 4} y={yPos(v) + 3} textAnchor="end" fontSize={10} fill="#9ca3af">
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {xLabelIndices.map((i) => (
          <text key={i} x={xPos(i)} y={height - 5} textAnchor="middle" fontSize={10} fill="#9ca3af">
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
            stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,3" />
        )}
      </svg>
      {hd && hoverIdx !== null && (
        <div
          style={{ position: 'absolute', left: Math.min(xPos(hoverIdx) + 8, width - 110), top: margin.top, pointerEvents: 'none' }}
          className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-sm z-10"
        >
          <p className="font-medium text-gray-500 mb-1">{hd.date}</p>
          <p>시&nbsp;<span className="font-mono">{hd.open.toLocaleString()}</span></p>
          <p>고&nbsp;<span className="font-mono text-red-500">{hd.high.toLocaleString()}</span></p>
          <p>저&nbsp;<span className="font-mono text-blue-500">{hd.low.toLocaleString()}</span></p>
          <p>종&nbsp;<span className={`font-mono font-semibold ${hd.close >= hd.open ? 'text-red-500' : 'text-blue-500'}`}>{hd.close.toLocaleString()}</span></p>
        </div>
      )}
    </div>
  )
}

const VERDICT_CONFIG = {
  entry: { label: '매수 추천', className: 'bg-red-50 text-red-600 border-red-100' },
  watch: { label: '관찰 중', className: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  exit: { label: '매수 비추천', className: 'bg-blue-50 text-blue-600 border-blue-100' },
}

export default function StockAnalysis({ ticker }: Props) {
  const [prices, setPrices] = useState<DailyPrice[]>([])
  const [stock, setStock] = useState<Stock | null>(null)
  const [quote, setQuote] = useState<CurrentQuote | null>(null)
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
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [ticker])

  useEffect(() => {
    const id = setInterval(() => {
      fetchCurrentQuote(ticker).then(setQuote).catch(() => {})
    }, 1_000)
    return () => clearInterval(id)
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        분석 중...
      </div>
    )
  }

  if (error || prices.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        {error ?? '동기화 후 분석이 가능합니다. POST /data-sync/prices를 실행해주세요.'}
      </div>
    )
  }

  const { factors, verdict } = calcFactors(prices)
  const verdictConfig = VERDICT_CONFIG[verdict]

  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))
  const latestClose = quote?.price ?? Number(sorted[sorted.length - 1].close)
  const latestChangeRate = quote?.changeRate ?? 0
  const isUp = latestChangeRate >= 0
  const changeColor = isUp ? 'text-red-500' : 'text-blue-500'

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-blue-600 text-sm">{ticker}</span>
            {stock && <span className="font-semibold text-gray-900">{stock.name}</span>}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-gray-900">{latestClose.toLocaleString()}원</span>
            <span className={`text-sm font-medium ${changeColor}`}>
              {isUp ? '+' : ''}{latestChangeRate.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">전일 대비 · 최근 30일 분석</p>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${verdictConfig.className}`}>
          {verdictConfig.label}
        </span>
      </div>

      <div className="px-6 pt-5 pb-2 grid grid-cols-10 gap-6">
        {/* 캔들차트 */}
        <div className="col-span-7">
          <p className="text-xs font-medium text-gray-500 mb-2">
            캔들차트 <span className="text-gray-300 font-normal">(수정주가 기준)</span>
          </p>
          <div ref={candleRef} style={{ height: 160 }}>
            {candleW > 0 && (
              <CandlestickSVGChart data={candleChartData} domain={[candleYDomain[0], candleYDomain[1]]} width={candleW} height={160} />
            )}
          </div>
        </div>

        {/* 7일 누적 외인 순매수 수치 */}
        <div className="col-span-3 flex flex-col items-center justify-center gap-2">
          <p className="text-xs font-medium text-gray-500">7일 누적 외인 순매수</p>
          {(() => {
            const latest = netBuyChartData[netBuyChartData.length - 1]
            const sum = latest?.sum ?? 0
            const isPositive = sum >= 0
            return (
              <span
                className={`font-bold tabular-nums ${isPositive ? 'text-red-500' : 'text-blue-500'}`}
                style={{ fontSize: '32px', lineHeight: 1.2 }}
              >
                {isPositive ? '+' : ''}{sum.toLocaleString()}
              </span>
            )
          })()}
          <p className="text-xs text-gray-400">주</p>
        </div>
      </div>

      {/* 요인 분석 */}
      <div className="px-6 pb-5 grid grid-cols-3 gap-3">
        {factors.map((f) => (
          <div key={f.label} className={`rounded-xl px-4 py-3 border ${f.met ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-base ${f.met ? 'text-red-500' : 'text-gray-300'}`}>{f.met ? '✓' : '✗'}</span>
              <span className={`text-xs font-semibold ${f.met ? 'text-red-600' : 'text-gray-500'}`}>{f.label}</span>
            </div>
            <p className="text-xs text-gray-500">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
