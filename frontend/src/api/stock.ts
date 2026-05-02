import axios from 'axios'
import { getToken, clearToken } from '../utils/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      clearToken()
      window.location.reload()
    }
    return Promise.reject(err)
  },
)

export interface Stock {
  id: number
  ticker: string
  name: string
}

export interface ForeignRankingItem {
  ticker: string
  name: string
  foreignNetBuy: number
  date: string
  consecutiveDays: number
}

export interface StockLookupResult {
  ticker: string
  name: string
}

export interface DailyPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  foreignNetBuy: number
  changeRate: number
}

export interface CreateStockDto {
  ticker: string
  name: string
}

export async function fetchStocks(): Promise<Stock[]> {
  const res = await api.get<{ data: Stock[] }>('/stocks')
  return res.data.data
}

export async function fetchForeignRanking(): Promise<ForeignRankingItem[]> {
  const res = await api.get<{ data: ForeignRankingItem[] }>('/stocks/ranking/foreign')
  return res.data.data
}

export async function createStock(dto: CreateStockDto): Promise<Stock> {
  const res = await api.post<{ data: Stock }>('/stocks', dto)
  return res.data.data
}

export async function lookupStock(ticker: string): Promise<StockLookupResult> {
  const res = await api.get<{ data: StockLookupResult }>(`/data-sync/lookup/${ticker}`)
  return res.data.data
}

export async function fetchPrices(ticker: string): Promise<DailyPrice[]> {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const res = await api.get<{ data: DailyPrice[] }>(`/stocks/${ticker}/prices`, {
    params: { from, to },
  })
  return res.data.data
}

export interface CurrentQuote {
  price: number
  changeRate: number
}

export async function fetchCurrentQuote(ticker: string): Promise<CurrentQuote> {
  const res = await api.get<{ data: CurrentQuote }>(`/data-sync/quote/${ticker}`)
  return res.data.data
}

export interface StockSignal {
  patternName: string
  patternCategory: string | null
  stopLoss: number
  status: '스윙 진입' | '과열/하락 경고' | '관심 집중' | '조건 대기'
  isRecommend: boolean
  reason: string
}

export async function deleteStock(ticker: string): Promise<void> {
  await api.delete(`/stocks/${ticker}`)
}

export async function deleteAllStocks(): Promise<void> {
  await api.delete('/stocks')
}

export async function syncPrices(): Promise<void> {
  await api.post('/data-sync/prices')
}

export async function syncSignals(): Promise<void> {
  await api.post('/data-sync/signals')
}

export async function fetchSignal(ticker: string, changeRate?: number): Promise<StockSignal> {
  const res = await api.get<{ data: StockSignal }>(`/stocks/${ticker}/prices/signal`, {
    params: changeRate !== undefined ? { changeRate } : {},
  })
  return res.data.data
}
