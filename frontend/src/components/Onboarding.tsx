interface Props {
  onStart: () => void
}

const STEPS = [
  { n: 1, text: '증권 관련 사이트에서 종목코드를 검색한 뒤 위 입력창에 입력합니다.' },
  { n: 2, text: '상단의 일봉 동기화 버튼을 눌러 데이터를 수집합니다.' },
  { n: 3, text: '새로고침 버튼을 누른 후 최근 검색 종목에서 종목을 선택합니다.' },
  { n: 4, text: '매매 시그널을 클릭하면 상세 분석 결과를 확인할 수 있습니다.' },
]

export default function Onboarding({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-bold text-white mb-3">시작하기 전에</h1>
          <p className="text-sm text-[#a3a3a3] leading-relaxed">
            이 서비스는 투자 보조 도구일 뿐이며,<br />
            모든 투자의 책임은 사용자에게 있습니다.
          </p>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-sm p-5 mb-5 space-y-4">
          <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1">사용 방법</p>
          {STEPS.map(({ n, text }) => (
            <div key={n} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-sm bg-[#262626] text-[#a3a3a3] text-xs font-bold flex items-center justify-center">
                {n}
              </span>
              <p className="text-sm text-[#e5e5e5] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="w-full py-3 text-sm font-semibold text-white bg-[#1c1c1c] border border-[#333] rounded-sm hover:bg-[#262626] transition-colors cursor-pointer"
        >
          시작하기
        </button>
      </div>
    </div>
  )
}
