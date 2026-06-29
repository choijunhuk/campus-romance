import { useState } from 'react'
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
  const [zoom, setZoom] = useState<{ eventId: string; title: string } | null>(null)

  const unlockedCount = cgs.filter((c) => unlocked.has(c.eventId)).length

  return (
    <div className="flex h-full w-full flex-col bg-ink text-cream">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h1 className="text-xl font-bold">
          CG 갤러리 <span className="text-sm font-normal text-cream/50">{unlockedCount}/{cgs.length}</span>
        </h1>
        <button
          onClick={() => setScreen('title')}
          className="rounded-lg bg-panel px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-panel/70"
        >
          타이틀로
        </button>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
        {cgs.map(({ eventId, title }) => {
          const isUnlocked = unlocked.has(eventId)
          return (
            <button
              key={eventId}
              disabled={!isUnlocked}
              onClick={() => isUnlocked && setZoom({ eventId, title })}
              className="overflow-hidden rounded-xl bg-panel text-left ring-1 ring-white/10 transition enabled:hover:ring-amber/50 disabled:cursor-default"
            >
              <div className="aspect-video w-full bg-black/40">
                {isUnlocked ? (
                  <SmartImage
                    src={`/assets/cg/${eventId}.png`}
                    alt={title}
                    label={title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-cream/30">
                    ？
                  </div>
                )}
              </div>
              <p className="truncate px-3 py-2 text-xs text-cream/70">
                {isUnlocked ? title : '잠김'}
              </p>
            </button>
          )
        })}
      </div>

      {characters.length === 0 && (
        <p className="p-4 text-center text-sm text-cream/50">
          캐릭터 데이터를 불러오지 못했습니다 ({charById.size} loaded).
        </p>
      )}

      {/* Zoom view */}
      {zoom && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
          onClick={() => setZoom(null)}
        >
          <SmartImage
            src={`/assets/cg/${zoom.eventId}.png`}
            alt={zoom.title}
            label={zoom.title}
            className="max-h-[80%] max-w-full rounded-xl object-contain ring-1 ring-white/15"
          />
          <p className="text-sm text-cream/80">{zoom.title}</p>
          <button
            onClick={() => setZoom(null)}
            className="rounded-xl bg-panel px-5 py-2 text-sm text-cream ring-1 ring-white/15 hover:bg-panel/70"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}
