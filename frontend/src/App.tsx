import { useState } from 'react';
import StockAddForm from './components/StockAddForm';
import RecentStockList from './components/RecentStockList';
import StockAnalysis from './components/StockAnalysis';
import ForeignRankingTable from './components/ForeignRankingTable';
import { getRecentTickers } from './utils/recentTickers';
import { syncPrices, syncSignals } from './api/stock';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    () => getRecentTickers()[0] ?? null,
  );
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncingSignals, setSyncingSignals] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    setSyncMsg(null);
    try {
      await syncPrices();
      setSyncMsg('일봉 동기화 시작됨');
    } catch {
      setSyncMsg('동기화 요청 실패');
    } finally {
      setSyncingPrices(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  };

  const handleSyncSignals = async () => {
    setSyncingSignals(true);
    setSyncMsg(null);
    try {
      await syncSignals();
      setSyncMsg('신호 탐지 시작됨');
    } catch {
      setSyncMsg('신호 탐지 요청 실패');
    } finally {
      setSyncingSignals(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  };

  const handleAdded = (ticker: string) => {
    setSelectedTicker(ticker);
    setRefreshKey((k) => k + 1);
    setRankingRefreshKey((k) => k + 1);
  };

  const handleDeleted = (deletedTicker?: string) => {
    setRankingRefreshKey((k) => k + 1);
    if (deletedTicker && selectedTicker === deletedTicker) {
      setSelectedTicker(getRecentTickers()[0] ?? null);
    } else if (!deletedTicker) {
      setSelectedTicker(null);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-[#262626] px-4 sm:px-6 py-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight min-w-0">
            <span className="sm:hidden">스윙 보조 도구</span>
            <span className="hidden sm:inline">
              너넨 지금 전혀 스윙하고 있지 않아
              <span className="text-sm font-normal text-[#a3a3a3]">
                {' '}
                — 스윙 투자 보조 도구
              </span>
            </span>
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {syncMsg && (
              <span className="hidden sm:inline text-xs text-[#a3a3a3] whitespace-nowrap mr-1">
                {syncMsg}
              </span>
            )}
            <button
              onClick={() => void handleSyncPrices()}
              disabled={syncingPrices || syncingSignals}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              {syncingPrices ? (
                '동기화 중...'
              ) : (
                <>
                  <span className="sm:hidden">동기화</span>
                  <span className="hidden sm:inline">일봉 동기화</span>
                </>
              )}
            </button>
            <button
              onClick={() => void handleSyncSignals()}
              disabled={syncingPrices || syncingSignals}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              {syncingSignals ? (
                '탐지 중...'
              ) : (
                <>
                  <span className="sm:hidden">신호</span>
                  <span className="hidden sm:inline">신호 탐지</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
        <StockAddForm onAdded={handleAdded} />
        {selectedTicker && <StockAnalysis ticker={selectedTicker} />}
        <RecentStockList
          refreshKey={refreshKey}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
          onDeleted={handleDeleted}
        />
        <ForeignRankingTable refreshKey={rankingRefreshKey} />
      </main>
    </div>
  );
}
