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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">종목 추가</h2>

      <div className="flex gap-3 items-center">
        <input
          value={ticker}
          onChange={(e) => { setTicker(e.target.value); setPreview(null) }}
          onKeyDown={handleKeyDown}
          placeholder="종목코드 입력 (예: 005930)"
          maxLength={6}
          className="w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          onClick={() => void handleLookup()}
          disabled={lookupLoading || !ticker.trim()}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          {lookupLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {lookupError && (
        <p className="mt-3 text-xs text-red-500">{lookupError}</p>
      )}

      {preview && (
        <div className="mt-4 flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex-1">
            <span className="font-mono font-medium text-blue-600 text-sm">{preview.ticker}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="font-medium text-gray-900 text-sm">{preview.name}</span>
            <span className={`ml-3 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              preview.market === 'KOSPI' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
            }`}>
              {preview.market}
            </span>
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={addLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {addLoading ? '추가 중...' : '추가하기'}
          </button>
        </div>
      )}
    </div>
  )
}
