import { useState } from 'react';
import StockAddForm from './components/StockAddForm';
import RecentStockList from './components/RecentStockList';
import StockAnalysis from './components/StockAnalysis';
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">
          너넨 지금 스윙하고 있지 않아
          <span className="text-sm font-light"> (스윙 투자 보조 도구)</span>
        </h1>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <StockAddForm onAdded={handleAdded} />
        {selectedTicker && <StockAnalysis ticker={selectedTicker} />}
        <RecentStockList
          refreshKey={refreshKey}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
        />
      </main>
    </div>
  );
}
