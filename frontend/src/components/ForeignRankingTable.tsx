import { useEffect, useState } from 'react'
import { fetchForeignRanking } from '../api/stock'
import type { ForeignRankingItem } from '../api/stock'

export default function ForeignRankingTable() {
  const [data, setData] = useState<ForeignRankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchForeignRanking())
    } catch {
      setError('데이터를 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">외국인 순매수 순위</h2>
          <p className="text-sm text-gray-400 mt-0.5">최근 동기화 기준 주간 누적 순매수량</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mx-6 my-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-right font-medium w-12">순위</th>
              <th className="px-6 py-3 text-left font-medium">종목코드</th>
              <th className="px-6 py-3 text-left font-medium">종목명</th>
              <th className="px-6 py-3 text-center font-medium">시장</th>
              <th className="px-6 py-3 text-right font-medium">주간 순매수량</th>
              <th className="px-6 py-3 text-center font-medium">기준일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && !data.length ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((item, idx) => (
                <tr key={item.ticker} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-right font-mono text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-blue-600">
                    {item.ticker}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      item.market === 'KOSPI'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {item.market}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                    {item.foreignNetBuy.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-400">
                    {item.date}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !data.length && !error && (
          <div className="px-6 py-16 text-center text-gray-400">
            데이터가 없습니다. 데이터 동기화를 먼저 실행해 주세요.
          </div>
        )}
      </div>
    </div>
  )
}
