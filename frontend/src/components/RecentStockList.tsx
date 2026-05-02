import { useEffect, useState } from 'react'
import { fetchStocks, fetchForeignRanking } from '../api/stock'
import type { Stock, ForeignRankingItem } from '../api/stock'
import { getRecentTickers, removeRecentTicker, clearRecentTickers } from '../utils/recentTickers'

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
    <div className="bg-[#141414] border border-[#262626] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#262626]">
        <div>
          <h2 className="text-sm font-medium text-white tracking-tight">최근 검색 종목</h2>
          <p className="text-xs text-[#a3a3a3] mt-0.5">종목 클릭 시 분석 화면으로 이동 · 7일 누적 외인 순매수</p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button
              onClick={() => { clearRecentTickers(); setRows([]) }}
              className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-[#ef4444] transition-colors cursor-pointer whitespace-nowrap"
            >
              모두 삭제
            </button>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 my-4 px-4 py-3 bg-[#1c1c1c] border border-[#ef4444]/30 text-[#ef4444] text-sm rounded-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1c1c1c] text-[#a3a3a3] text-xs uppercase tracking-wider">
              <th className="px-3 sm:px-6 py-3 text-left font-medium">종목명</th>
              <th className="px-3 sm:px-6 py-3 text-right font-medium">7일 순매수</th>
              <th className="px-3 sm:px-6 py-3 text-center font-medium">기준일</th>
              <th className="px-3 sm:px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1c1c]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <td key={j} className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-3 bg-[#262626] rounded-sm animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              rows.slice(0, 10).map((row) => (
                <tr
                  key={row.ticker}
                  onClick={() => onSelect(row.ticker)}
                  className={`cursor-pointer transition-colors ${
                    selectedTicker === row.ticker
                      ? 'bg-[#1c1c1c]'
                      : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-white">{row.name}</td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${
                    row.foreignNetBuy === undefined
                      ? 'text-[#a3a3a3]'
                      : row.foreignNetBuy >= 0
                        ? 'text-[#ef4444]'
                        : 'text-[#3b82f6]'
                  }`}>
                    {row.foreignNetBuy === undefined
                      ? '동기화 필요'
                      : Number(row.foreignNetBuy).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center text-[#a3a3a3] text-xs">
                    {row.date ?? '—'}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeRecentTicker(row.ticker)
                        setRows((prev) => prev.filter((r) => r.ticker !== row.ticker))
                      }}
                      className="text-[#525252] hover:text-[#ef4444] transition-colors cursor-pointer text-xs leading-none"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !rows.length && !error && (
          <div className="px-6 py-16 text-center text-[#a3a3a3] text-sm">
            아직 추가한 종목이 없어요. 위에서 종목코드를 입력해 추가해보세요.
          </div>
        )}
      </div>
    </div>
  )
}
