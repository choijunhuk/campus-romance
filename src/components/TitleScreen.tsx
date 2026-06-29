import { useState } from 'react'
import { useGame } from '../store'
import { world, usingDemo, loadErrors, characters } from '../engine/load'
import { SaveLoadMenu } from './SaveLoadMenu'
import { SmartImage } from './ui'

export function TitleScreen() {
  const start = useGame((s) => s.start)
  const load = useGame((s) => s.load)
  const setScreen = useGame((s) => s.setScreen)
  const listSaves = useGame((s) => s.listSaves)
  const galleryIds = useGame((s) => s.galleryIds)
  const [name, setName] = useState('')
  const [showLoad, setShowLoad] = useState(false)

  const hasAuto = !!listSaves().auto
  const titles = world?.title ?? ['Campus Romance']
  // Ending collection: each character has good/normal/bad + the solo route.
  const totalEndings = characters.length * 3 + 1
  const seenEndings = galleryIds().filter((id) => id.endsWith('_ending')).length

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Title art (falls back to a warm gradient if the asset is missing) */}
      <SmartImage
        src="/assets/ui/title_screen.png"
        alt="title"
        label=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink/85" />

      <div className="relative z-10 flex flex-col items-center">
      <p className="mb-2 text-sm tracking-widest text-amber-soft/90">CAMPUS ROMANCE</p>
      <h1 className="mb-1 text-4xl font-bold text-cream drop-shadow sm:text-5xl">{titles[0]}</h1>
      <p className="mb-8 max-w-md text-sm text-cream/80">
        복학 첫 학기, 동아리 ‘회로의 봄’에서 다시 마주친 네 사람과의 한 학기.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start(name)}
          placeholder="주인공 이름을 입력하세요"
          maxLength={12}
          className="rounded-xl bg-panel/90 px-4 py-3 text-center text-cream placeholder:text-cream/40 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-rose"
        />
        <button
          onClick={() => start(name)}
          className="rounded-xl bg-rose py-3 font-semibold text-ink transition hover:bg-rose-soft"
        >
          시작하기
        </button>
        {hasAuto && (
          <button
            onClick={() => load('auto')}
            className="rounded-xl bg-panel/90 py-2.5 text-cream ring-1 ring-white/10 transition hover:bg-panel"
          >
            이어하기
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setShowLoad(true)}
            className="flex-1 rounded-xl bg-panel/90 py-2.5 text-cream ring-1 ring-white/10 transition hover:bg-panel"
          >
            불러오기
          </button>
          <button
            onClick={() => setScreen('gallery')}
            className="flex-1 rounded-xl bg-panel/90 py-2.5 text-cream ring-1 ring-white/10 transition hover:bg-panel"
          >
            CG 갤러리
          </button>
        </div>
        {seenEndings > 0 && (
          <p className="text-xs text-amber-soft/80">
            엔딩 수집 {seenEndings} / {totalEndings}
            {seenEndings >= totalEndings && ' · 올 클리어! ✦'}
          </p>
        )}
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
