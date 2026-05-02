import { useEffect, useState } from 'react';
import {
  fetchStocks,
  fetchForeignRanking,
  deleteStock,
  deleteAllStocks,
} from '../api/stock';
import type { Stock, ForeignRankingItem } from '../api/stock';

interface StockRow extends Stock {
  foreignNetBuy?: number;
  date?: string;
}

interface Props {
  refreshKey: number;
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  onDeleted?: (ticker?: string) => void;
}

export default function RecentStockList({
  refreshKey,
  selectedTicker,
  onSelect,
  onDeleted,
}: Props) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stocks, ranking] = await Promise.all([
        fetchStocks(),
        fetchForeignRanking(),
      ]);

      if (stocks.length === 0) {
        setRows([]);
        return;
      }

      const rankingMap = new Map<string, ForeignRankingItem>(
        ranking.map((r) => [r.ticker, r]),
      );

      // recentTickers 대신 불러온 stocks 배열을 기준으로 매핑합니다.
      const merged: StockRow[] = stocks.map((stock) => {
        const r = rankingMap.get(stock.ticker);
        return {
          id: stock.id ?? 0,
          ticker: stock.ticker,
          name: stock.name ?? stock.ticker,
          foreignNetBuy: r?.foreignNetBuy,
          date: r?.date,
        };
      });

      setRows(merged);
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshKey]);

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#262626]">
        <div>
          <h2 className="text-sm font-medium text-white tracking-tight">
            추가된 종목
          </h2>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            클릭 시 분석 · <span className="hidden sm:inline">7일 누적</span>{' '}
            외인 순매수
          </p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={async () => {
              await deleteAllStocks();
              setRows([]);
              onDeleted?.();
            }}
            className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-[#ef4444] transition-colors cursor-pointer whitespace-nowrap"
          >
            모두 삭제
          </button>
        )}
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
              <th className="px-3 sm:px-6 py-3 text-left font-medium">
                종목명
              </th>
              <th className="px-3 sm:px-6 py-3 text-right font-medium">
                7일 순매수
              </th>
              <th className="hidden sm:table-cell px-6 py-3 text-center font-medium">
                기준일
              </th>
              <th className="px-3 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1c1c]">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-3 bg-[#262626] rounded-sm animate-pulse" />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-3 bg-[#262626] rounded-sm animate-pulse" />
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 sm:py-4">
                      <div className="h-3 bg-[#262626] rounded-sm animate-pulse" />
                    </td>
                    <td className="px-3 py-3 sm:py-4 w-8" />
                  </tr>
                ))
              : rows.slice(0, 10).map((row) => (
                  <tr
                    key={row.ticker}
                    onClick={() => onSelect(row.ticker)}
                    className={`cursor-pointer transition-colors ${
                      selectedTicker === row.ticker
                        ? 'bg-[#1c1c1c]'
                        : 'hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-white">
                      {row.name}
                    </td>
                    <td
                      className={`px-3 sm:px-6 py-3 sm:py-4 text-right font-mono font-medium ${
                        row.foreignNetBuy === undefined
                          ? 'text-[#a3a3a3]'
                          : row.foreignNetBuy >= 0
                            ? 'text-[#ef4444]'
                            : 'text-[#3b82f6]'
                      }`}
                    >
                      {row.foreignNetBuy === undefined
                        ? '—'
                        : Number(row.foreignNetBuy).toLocaleString()}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 sm:py-4 text-center text-[#a3a3a3] text-xs">
                      {row.date ?? '—'}
                    </td>
                    <td className="px-3 py-3 sm:py-4 text-right w-8">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteStock(row.ticker);
                          setRows((prev) =>
                            prev.filter((r) => r.ticker !== row.ticker),
                          );
                          onDeleted?.(row.ticker);
                        }}
                        className="text-[#525252] hover:text-[#ef4444] transition-colors cursor-pointer text-xs leading-none"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && !rows.length && !error && (
          <div className="px-6 py-16 text-center text-[#a3a3a3] text-sm">
            아직 추가한 종목이 없어요. 위에서 종목코드를 입력해 추가해보세요.
          </div>
        )}
      </div>
    </div>
  );
}
