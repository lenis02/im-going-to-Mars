const KEY = 'recentTickers'
const MAX = 10

export function getRecentTickers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addRecentTicker(ticker: string): void {
  const prev = getRecentTickers().filter((t) => t !== ticker)
  localStorage.setItem(KEY, JSON.stringify([ticker, ...prev].slice(0, MAX)))
}
