import { useEffect, useState } from 'react'
import { fetchStocks, fetchForeignRanking } from '../api/stock'
import type { Stock, ForeignRankingItem } from '../api/stock'
import { getRecentTickers } from '../utils/recentTickers'

interface StockRow extends Stock {
  foreignNetBuy?: number
  date?: string
}

interface Props {
  refreshKey: number
  selectedTicker: string | null
  onSelect: (ticker: string) => void
}

export default function RecentStockList({ refreshKey, selectedTicker, onSelect }: Props) {
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stocks, ranking] = await Promise.all([fetchStocks(), fetchForeignRanking()])

      const rankingMap = new Map<string, ForeignRankingItem>(
        ranking.map((r) => [r.ticker, r]),
      )

      const recentTickers = getRecentTickers()
      const recentSet = new Set(recentTickers)

      const merged: StockRow[] = stocks
        .filter((s) => recentSet.has(s.ticker))
        .map((s) => {
          const r = rankingMap.get(s.ticker)
          return { ...s, foreignNetBuy: r?.foreignNetBuy, date: r?.date }
        })

      merged.sort(
        (a, b) => recentTickers.indexOf(a.ticker) - recentTickers.indexOf(b.ticker),
      )

      setRows(merged)
    } catch {
      setError('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [refreshKey])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">최근 검색 종목</h2>
          <p className="text-xs text-gray-400 mt-0.5">종목 클릭 시 분석 화면으로 이동 · 7일 누적 외인 순매수</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {error && (
        <div className="mx-6 my-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left font-medium">종목코드</th>
              <th className="px-6 py-3 text-left font-medium">종목명</th>
              <th className="px-6 py-3 text-center font-medium">시장</th>
              <th className="px-6 py-3 text-right font-medium">7일 순매수</th>
              <th className="px-6 py-3 text-center font-medium">기준일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              rows.map((row) => (
                <tr
                  key={row.ticker}
                  onClick={() => onSelect(row.ticker)}
                  className={`cursor-pointer transition-colors ${
                    selectedTicker === row.ticker
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 font-mono font-medium text-blue-600">
                    {row.ticker}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      row.market === 'KOSPI'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {row.market}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${
                    row.foreignNetBuy === undefined
                      ? 'text-gray-300'
                      : row.foreignNetBuy >= 0
                        ? 'text-red-500'
                        : 'text-blue-500'
                  }`}>
                    {row.foreignNetBuy === undefined
                      ? '동기화 필요'
                      : row.foreignNetBuy.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-400 text-xs">
                    {row.date ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !rows.length && !error && (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            아직 추가한 종목이 없어요. 위에서 종목코드를 입력해 추가해보세요.
          </div>
        )}
      </div>
    </div>
  )
}
