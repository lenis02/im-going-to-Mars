import { useEffect, useRef, useState } from 'react'
import { searchStockMaster, createStock, fetchStocks } from '../api/stock'
import type { StockMasterItem } from '../api/stock'
import { addRecentTicker } from '../utils/recentTickers'

interface Props {
  onAdded: (ticker: string) => void
}

export default function StockAddForm({ onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockMasterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<StockMasterItem | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [open, setOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchStockMaster(query.trim())
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (item: StockMasterItem) => {
    setSelected(item)
    setQuery(item.name)
    setOpen(false)
    setAddError(null)
    const stocks = await fetchStocks()
    setIsDuplicate(stocks.some((s) => s.ticker === item.ticker))
  }

  const handleAdd = async () => {
    if (!selected) return
    setAddLoading(true)
    setAddError(null)
    try {
      await createStock({ ticker: selected.ticker, name: selected.name })
      addRecentTicker(selected.ticker)
      setQuery('')
      setSelected(null)
      setIsDuplicate(false)
      onAdded(selected.ticker)
    } catch {
      setAddError('등록에 실패했습니다.')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-sm px-4 sm:px-6 py-4 sm:py-5">
      <h2 className="text-sm font-medium text-white mb-4 tracking-tight">종목 추가</h2>

      <div className="relative" ref={containerRef}>
        <div className="relative sm:w-80">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="종목명 검색 (예: 삼성전자)"
            className="w-full px-3 py-2 text-sm bg-[#0d0d0d] border border-[#333] rounded-sm focus:outline-none focus:border-[#525252] text-white placeholder-[#a3a3a3] transition-colors"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="w-3.5 h-3.5 border border-[#525252] border-t-white rounded-full animate-spin inline-block" />
            </span>
          )}
        </div>

        {open && (
          <ul className="absolute z-10 top-full mt-1 sm:w-80 w-full bg-[#1c1c1c] border border-[#333] rounded-sm shadow-lg max-h-60 overflow-y-auto">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-[#525252]">검색 결과 없음</li>
            ) : (
              results.map((item) => (
                <li
                  key={item.ticker}
                  onMouseDown={() => void handleSelect(item)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#262626] cursor-pointer"
                >
                  <span className="font-mono text-xs text-[#22c55e] w-14 shrink-0">{item.ticker}</span>
                  <span className="text-sm text-white truncate">{item.name}</span>
                  <span className="ml-auto text-xs text-[#525252] shrink-0">{item.market}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {addError && (
        <p className="mt-3 text-xs text-[#ef4444]">{addError}</p>
      )}

      {selected && (
        <div className={`mt-4 flex items-center gap-4 px-4 py-3 bg-[#1c1c1c] border rounded-sm ${isDuplicate ? 'border-[#f59e0b]/40' : 'border-[#262626]'}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-medium text-[#22c55e] text-sm">{selected.ticker}</span>
              <span className="text-[#a3a3a3]">·</span>
              <span className="font-medium text-white text-sm">{selected.name}</span>
              <span className="text-xs text-[#525252]">{selected.market}</span>
            </div>
            {isDuplicate && (
              <p className="text-[11px] text-[#f59e0b] mt-1">이미 추가된 종목입니다. 다시 추가하면 목록 상단으로 이동합니다.</p>
            )}
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={addLoading}
            className="shrink-0 px-4 py-2 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            {addLoading ? '추가 중...' : isDuplicate ? '재추가' : '추가하기'}
          </button>
        </div>
      )}
    </div>
  )
}
