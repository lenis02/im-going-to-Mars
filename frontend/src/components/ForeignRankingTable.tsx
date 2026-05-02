import { useEffect, useState } from 'react';
import { fetchForeignRanking } from '../api/stock';
import type { ForeignRankingItem } from '../api/stock';

export default function ForeignRankingTable() {
  const [data, setData] = useState<ForeignRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchForeignRanking());
    } catch {
      setError('데이터를 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#262626]">
        <div>
          <h2 className="text-sm font-medium text-white tracking-tight">외국인 순매수 순위</h2>
          <p className="text-xs text-[#a3a3a3] mt-0.5">최근 동기화 기준 주간 누적 순매수량</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 my-4 px-4 py-3 bg-[#1c1c1c] border border-[#ef4444]/30 text-[#ef4444] text-sm rounded-sm">
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1c1c1c] text-[#a3a3a3] text-xs uppercase tracking-wider">
            <th className="px-3 sm:px-6 py-3 text-right font-medium w-8 sm:w-12">순위</th>
            <th className="px-3 sm:px-6 py-3 text-left font-medium">종목명</th>
            <th className="px-3 sm:px-6 py-3 text-right font-medium">연속</th>
            <th className="px-3 sm:px-6 py-3 text-right font-medium">주간 순매수</th>
            <th className="hidden sm:table-cell px-6 py-3 text-center font-medium">기준일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c1c1c]">
          {loading && !data.length
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-3 bg-[#262626] rounded-sm animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((item, idx) => (
                <tr key={item.ticker} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-[#a3a3a3]">
                    {idx + 1}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-white">
                    {item.name}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium">
                    <span className={item.consecutiveDays >= 3 ? 'text-[#22c55e]' : 'text-[#e5e5e5]'}>
                      {item.consecutiveDays}일
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono font-medium text-white">
                    {item.foreignNetBuy.toLocaleString()}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-3 sm:py-4 text-center text-[#a3a3a3] text-xs">
                    {item.date}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>

      {!loading && !data.length && !error && (
        <div className="px-4 py-12 text-center text-[#a3a3a3] text-sm">
          데이터가 없습니다. 데이터 동기화를 먼저 실행해 주세요.
        </div>
      )}
    </div>
  );
}
