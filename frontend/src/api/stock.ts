import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000',
})

export interface ForeignRankingItem {
  ticker: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
  foreignNetBuy: number
  date: string
}

export async function fetchForeignRanking(): Promise<ForeignRankingItem[]> {
  const res = await api.get<{ data: ForeignRankingItem[] }>('/stocks/ranking/foreign')
  return res.data.data
}
