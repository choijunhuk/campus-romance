import { useGame } from '../store'
import { characters, charById } from '../engine/load'
import { SmartImage } from './ui'
import type { EndingTier } from '../types'

const TIERS: EndingTier[] = ['good', 'normal', 'bad']
const TIER_LABEL: Record<EndingTier, string> = { good: '굿', normal: '노멀', bad: '배드' }

/** Every event CG the game can unlock: each character × tier, plus the solo ending. */
function allEndingCGs(): { eventId: string; title: string }[] {
  const list: { eventId: string; title: string }[] = []
  for (const c of characters) {
    for (const tier of TIERS) {
      list.push({ eventId: `${c.id}_${tier}_ending`, title: `${c.name} · ${TIER_LABEL[tier]} 엔딩` })
    }
  }
  list.push({ eventId: 'solo_ending', title: '혼자 서는 봄' })
  return list
}

export function Gallery() {
  const setScreen = useGame((s) => s.setScreen)
  const unlocked = new Set(useGame((s) => s.galleryIds)())
  const cgs = allEndingCGs()

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h1 className="text-xl font-bold">CG 갤러리</h1>
        <button
          onClick={() => setScreen('title')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
        >
          타이틀로
        </button>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
        {cgs.map(({ eventId, title }) => {
          const isUnlocked = unlocked.has(eventId)
          return (
            <div key={eventId} className="overflow-hidden rounded-xl bg-slate-800 ring-1 ring-white/10">
              <div className="aspect-video w-full bg-slate-950">
                {isUnlocked ? (
                  <SmartImage
                    src={`/assets/cg/${eventId}.png`}
                    alt={title}
                    label={title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-slate-600">
                    ？
                  </div>
                )}
              </div>
              <p className="truncate px-3 py-2 text-xs text-slate-300">
                {isUnlocked ? title : '잠김'}
              </p>
            </div>
          )
        })}
      </div>
      {characters.length === 0 && (
        <p className="p-4 text-center text-sm text-slate-400">
          캐릭터 데이터를 불러오지 못했습니다 ({charById.size} loaded).
        </p>
      )}
    </div>
  )
}
