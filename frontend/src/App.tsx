import ForeignRankingTable from './components/ForeignRankingTable'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">
          📈 스윙 투자 보조 도구
        </h1>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <ForeignRankingTable />
      </main>
    </div>
  )
}
