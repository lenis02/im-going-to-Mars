import { useEffect, useRef, useState } from 'react';
import StockAddForm from './components/StockAddForm';
import RecentStockList from './components/RecentStockList';
import StockAnalysis from './components/StockAnalysis';
import ForeignRankingTable from './components/ForeignRankingTable';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import { getRecentTickers } from './utils/recentTickers';
import { syncPrices } from './api/stock';
import { getToken, setToken, clearToken, isLoggedIn } from './utils/auth';

type AppPhase = 'guide' | 'app'

const SYNC_COOLDOWN_SEC = 60;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())
  const [phase, setPhase] = useState<AppPhase>(
    () => (localStorage.getItem('swt_visited') ? 'app' : 'guide')
  )

  // Google OAuth 콜백: URL에 ?token= 파라미터 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setToken(token)
      setLoggedIn(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    () => getRecentTickers()[0] ?? null,
  );
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [syncWarning, setSyncWarning] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(SYNC_COOLDOWN_SEC);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGuideStart = () => {
    localStorage.setItem('swt_visited', '1')
    setPhase('app')
  }

  const handleSyncPrices = async () => {
    if (cooldown > 0) {
      setSyncWarning(true);
      setTimeout(() => setSyncWarning(false), 2000);
      return;
    }
    setSyncingPrices(true);
    setSyncError(null);
    try {
      await syncPrices();
      setRefreshKey((k) => k + 1);
      startCooldown();
    } catch {
      setSyncError('동기화 요청 실패');
      setTimeout(() => setSyncError(null), 3000);
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleAdded = (ticker: string) => {
    setSelectedTicker(ticker);
    setRefreshKey((k) => k + 1);
  };

  const handleDeleted = (deletedTicker?: string) => {
    setRefreshKey((k) => k + 1);
    if (deletedTicker && selectedTicker === deletedTicker) {
      setSelectedTicker(getRecentTickers()[0] ?? null);
    } else if (!deletedTicker) {
      setSelectedTicker(null);
    }
  };

  if (!loggedIn) {
    return <Login />
  }

  if (phase === 'guide') {
    return <Onboarding onStart={handleGuideStart} />
  }

  const syncBtnBase = 'px-2.5 sm:px-3 py-1.5 text-xs font-medium border rounded-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40';
  const syncBtnColor = syncWarning
    ? 'text-[#ef4444] bg-[#1c1c1c] border-[#ef4444]'
    : cooldown > 0
      ? 'text-[#525252] bg-[#1c1c1c] border-[#333]'
      : 'text-[#a3a3a3] bg-[#1c1c1c] border-[#333] hover:bg-[#262626] hover:text-white';

  return (
    <div className="min-h-screen bg-transparent">
      {syncingPrices && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#333] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-white">일봉 데이터 동기화 중...</p>
            <p className="text-xs text-[#a3a3a3] mt-1">완료되면 자동으로 새로고침됩니다</p>
          </div>
        </div>
      )}
      <header className="border-b border-[#262626] px-4 sm:px-6 py-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight min-w-0">
            <span className="sm:hidden">스윙 보조 도구</span>
            <span className="hidden sm:inline">
              너넨 지금 전혀 스윙하고 있지 않아
              <span className="text-sm font-normal text-[#a3a3a3]"> — 스윙 투자 보조 도구</span>
            </span>
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {syncWarning && (
              <span className="text-xs text-[#ef4444] whitespace-nowrap">너무 자주 동기화할 수 없어요</span>
            )}
            {syncError && !syncWarning && (
              <span className="text-xs text-[#ef4444] whitespace-nowrap">{syncError}</span>
            )}
            <button
              onClick={() => { clearToken(); setLoggedIn(false) }}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#525252] bg-[#1c1c1c] border border-[#262626] rounded-sm hover:text-[#ef4444] transition-colors cursor-pointer whitespace-nowrap"
            >
              로그아웃
            </button>
            <button
              onClick={handleRefresh}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              새로고침
            </button>
            <button
              onClick={() => void handleSyncPrices()}
              disabled={syncingPrices}
              className={`${syncBtnBase} ${syncBtnColor}`}
            >
              {cooldown > 0 ? (
                <>
                  <span className="sm:hidden">동기화 ({cooldown}s)</span>
                  <span className="hidden sm:inline">일봉 동기화 ({cooldown}s)</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">동기화</span>
                  <span className="hidden sm:inline">일봉 동기화</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
        <StockAddForm onAdded={handleAdded} />
        {selectedTicker && <StockAnalysis ticker={selectedTicker} refreshKey={refreshKey} />}
        <RecentStockList
          refreshKey={refreshKey}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
          onDeleted={handleDeleted}
        />
        <ForeignRankingTable refreshKey={refreshKey} onSelect={setSelectedTicker} selectedTicker={selectedTicker} />
      </main>
    </div>
  );
}
