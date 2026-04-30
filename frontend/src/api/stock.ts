import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000',
})

export interface Stock {
  id: number
  ticker: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
}

export interface ForeignRankingItem {
  ticker: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
  foreignNetBuy: number
  date: string
}

export interface StockLookupResult {
  ticker: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
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
  market: 'KOSPI' | 'KOSDAQ'
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
