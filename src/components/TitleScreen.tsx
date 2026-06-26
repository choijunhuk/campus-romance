import { useState } from 'react'
import { useGame } from '../store'
import { world, usingDemo, loadErrors } from '../engine/load'
import { SaveLoadMenu } from './SaveLoadMenu'

export function TitleScreen() {
  const start = useGame((s) => s.start)
  const load = useGame((s) => s.load)
  const setScreen = useGame((s) => s.setScreen)
  const listSaves = useGame((s) => s.listSaves)
  const [name, setName] = useState('')
  const [showLoad, setShowLoad] = useState(false)

  const hasAuto = !!listSaves().auto
  const titles = world?.title ?? ['Campus Romance']

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 text-center">
      <p className="mb-2 text-sm tracking-widest text-teal-300/80">CAMPUS ROMANCE</p>
      <h1 className="mb-1 text-4xl font-bold text-white sm:text-5xl">{titles[0]}</h1>
      <p className="mb-8 max-w-md text-sm text-slate-300">
        복학 첫 학기, 동아리 ‘회로의 봄’에서 다시 마주친 네 사람과의 한 학기.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start(name)}
          placeholder="주인공 이름을 입력하세요"
          maxLength={12}
          className="rounded-xl bg-slate-800 px-4 py-3 text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          onClick={() => start(name)}
          className="rounded-xl bg-teal-500 py-3 font-semibold text-slate-900 transition hover:bg-teal-400"
        >
          시작하기
        </button>
        {hasAuto && (
          <button
            onClick={() => load('auto')}
            className="rounded-xl bg-slate-700 py-2.5 text-white transition hover:bg-slate-600"
          >
            이어하기
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setShowLoad(true)}
            className="flex-1 rounded-xl bg-slate-700 py-2.5 text-white transition hover:bg-slate-600"
          >
            불러오기
          </button>
          <button
            onClick={() => setScreen('gallery')}
            className="flex-1 rounded-xl bg-slate-700 py-2.5 text-white transition hover:bg-slate-600"
          >
            CG 갤러리
          </button>
        </div>
      </div>

      {usingDemo && (
        <p className="mt-6 max-w-md text-xs text-amber-300/90">
          데모 모드: <code>src/data/scenes/</code> 에 씬 JSON이 없어 내장 데모 씬으로 실행 중입니다.
          씬 파일을 추가하면 자동으로 대체됩니다.
        </p>
      )}
      {loadErrors.length > 0 && (
        <div className="mt-3 max-w-md rounded-lg bg-red-950/70 p-3 text-left text-xs text-red-300">
          <p className="font-semibold">데이터 검증 오류:</p>
          <ul className="list-disc pl-4">
            {loadErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {showLoad && <SaveLoadMenu mode="load" onClose={() => setShowLoad(false)} />}
    </div>
  )
}
