import { useState } from 'react'
import { lookupStock, createStock } from '../api/stock'
import type { StockLookupResult } from '../api/stock'
import { addRecentTicker } from '../utils/recentTickers'

interface Props {
  onAdded: (ticker: string) => void
}

export default function StockAddForm({ onAdded }: Props) {
  const [ticker, setTicker] = useState('')
  const [preview, setPreview] = useState<StockLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const handleLookup = async () => {
    const t = ticker.trim().toUpperCase()
    if (!t) return

    setLookupLoading(true)
    setLookupError(null)
    setPreview(null)
    try {
      const result = await lookupStock(t)
      setPreview(result)
    } catch {
      setLookupError('종목을 찾을 수 없습니다. 종목코드를 확인해주세요.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!preview) return

    setAddLoading(true)
    try {
      await createStock(preview)
      addRecentTicker(preview.ticker)
      setTicker('')
      setPreview(null)
      onAdded(preview.ticker)
    } catch {
      setLookupError('등록에 실패했습니다.')
    } finally {
      setAddLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleLookup()
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-sm px-6 py-5">
      <h2 className="text-sm font-medium text-white mb-4 tracking-tight">종목 추가</h2>

      <div className="flex gap-3 items-center">
        <input
          value={ticker}
          onChange={(e) => { setTicker(e.target.value); setPreview(null) }}
          onKeyDown={handleKeyDown}
          placeholder="종목코드 입력 (예: 005930)"
          maxLength={6}
          className="w-56 px-3 py-2 text-sm bg-[#0d0d0d] border border-[#333] rounded-sm focus:outline-none focus:border-[#525252] font-mono text-white placeholder-[#a3a3a3] transition-colors"
        />
        <button
          onClick={() => void handleLookup()}
          disabled={lookupLoading || !ticker.trim()}
          className="px-4 py-2 text-xs font-medium text-[#a3a3a3] bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
        >
          {lookupLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {lookupError && (
        <p className="mt-3 text-xs text-[#ef4444]">{lookupError}</p>
      )}

      {preview && (
        <div className="mt-4 flex items-center gap-4 px-4 py-3 bg-[#1c1c1c] border border-[#262626] rounded-sm">
          <div className="flex-1 flex items-center gap-2">
            <span className="font-mono font-medium text-[#22c55e] text-sm">{preview.ticker}</span>
            <span className="text-[#a3a3a3]">·</span>
            <span className="font-medium text-white text-sm">{preview.name}</span>
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={addLoading}
            className="px-4 py-2 text-xs font-medium text-white bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {addLoading ? '추가 중...' : '추가하기'}
          </button>
        </div>
      )}
    </div>
  )
}
