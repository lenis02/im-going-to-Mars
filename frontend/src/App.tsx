import { useState } from 'react';
import StockAddForm from './components/StockAddForm';
import RecentStockList from './components/RecentStockList';
import StockAnalysis from './components/StockAnalysis';
import ForeignRankingTable from './components/ForeignRankingTable';
import { getRecentTickers } from './utils/recentTickers';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    () => getRecentTickers()[0] ?? null,
  );

  const handleAdded = (ticker: string) => {
    setSelectedTicker(ticker);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-[#262626] px-6 py-4 bg-[#0d0d0d]">
        <h1 className="text-base font-bold text-white tracking-tight">
          너넨 지금 전혀 스윙하고 있지 않아
          <span className="text-sm font-normal text-[#a3a3a3]">
            {' '}
            — 스윙 투자 보조 도구
          </span>
        </h1>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
        <StockAddForm onAdded={handleAdded} />
        {selectedTicker && <StockAnalysis ticker={selectedTicker} />}
        <RecentStockList
          refreshKey={refreshKey}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
        />
        <ForeignRankingTable />
      </main>
    </div>
  );
}
