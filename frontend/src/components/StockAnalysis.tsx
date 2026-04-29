import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchPrices, fetchStocks } from '../api/stock'
import type { DailyPrice, Stock } from '../api/stock'

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

  // 3. 전일 종가 대비 2~7% 상승
  const priceChangeRatio = prev.close > 0 ? latest.close / prev.close : 0
  const priceRise = priceChangeRatio >= 1.02 && priceChangeRatio <= 1.07

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
      detail: `+${((priceChangeRatio - 1) * 100).toFixed(2)}% (기준: +2%~+7%)`,
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

const VERDICT_CONFIG = {
  entry: { label: '매수 추천', className: 'bg-red-50 text-red-600 border-red-100' },
  watch: { label: '관찰 중', className: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  exit: { label: '매수 비추천', className: 'bg-blue-50 text-blue-600 border-blue-100' },
}

export default function StockAnalysis({ ticker }: Props) {
  const [prices, setPrices] = useState<DailyPrice[]>([])
  const [stock, setStock] = useState<Stock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchPrices(ticker), fetchStocks()])
      .then(([priceData, stocks]) => {
        setPrices(priceData)
        setStock(stocks.find((s) => s.ticker === ticker) ?? null)
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
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

  const priceChartData = [...prices]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ date: p.date.slice(5), close: Number(p.close) }))

  const netBuyChartData = calcRolling7(prices)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <span className="font-mono font-medium text-blue-600 text-sm">{ticker}</span>
          {stock && <span className="ml-2 font-semibold text-gray-900">{stock.name}</span>}
          <p className="text-xs text-gray-400 mt-0.5">최근 30일 · Entry 신호 분석</p>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${verdictConfig.className}`}>
          {verdictConfig.label}
        </span>
      </div>

      <div className="px-6 pt-5 pb-2 grid grid-cols-10 gap-6">
        {/* 종가 차트 */}
        <div className="col-span-7">
          <p className="text-xs font-medium text-gray-500 mb-2">종가 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={priceChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, '종가']} />
              <Line dataKey="close" type="monotone" stroke="#f59e0b" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
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
