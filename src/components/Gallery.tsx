import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { characters, charById } from '../engine/load'
import { SmartImage, assetUrl } from './ui'
import type { EndingTier } from '../types'

const TIERS: EndingTier[] = ['good', 'normal', 'bad']
const TIER_LABEL: Record<EndingTier, string> = { good: '굿', normal: '노멀', bad: '배드' }

interface CG {
  eventId: string
  title: string
  /** True once the player has unlocked this CG. */
  unlocked: boolean
}

/** Every event CG the game can unlock: each character × tier, plus the solo ending. */
function endingCGs(unlocked: Set<string>): CG[] {
  const list: CG[] = []
  for (const c of characters) {
    for (const tier of TIERS) {
      const eventId = `${c.id}_${tier}_ending`
      list.push({ eventId, title: `${c.name} · ${TIER_LABEL[tier]} 엔딩`, unlocked: unlocked.has(eventId) })
    }
  }
  list.push({ eventId: 'solo_ending', title: '혼자 서는 봄', unlocked: unlocked.has('solo_ending') })
  return list
}

/** Summer bonus CGs (19+) — one per character, unlocked once any of that
 * character's endings has been reached (i.e. their route is cleared). */
function summerCGs(unlocked: Set<string>): CG[] {
  return characters.map((c) => ({
    eventId: `${c.id}_summer`,
    title: `${c.name} · 여름 ☀`,
    unlocked: TIERS.some((t) => unlocked.has(`${c.id}_${t}_ending`)),
  }))
}

const GALLERY_SEEN_KEY = 'vn_gallery_seen'

function readGallerySeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(GALLERY_SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function markGallerySeen(ids: string[]) {
  try {
    const seen = readGallerySeen()
    for (const id of ids) seen.add(id)
    localStorage.setItem(GALLERY_SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

export function Gallery() {
  const setScreen = useGame((s) => s.setScreen)
  const unlocked = new Set(useGame((s) => s.galleryIds)())
  const endings = endingCGs(unlocked)
  const summer = summerCGs(unlocked)
  const [zoom, setZoom] = useState<CG | null>(null)
  // Snapshot of which CGs were already viewed BEFORE this visit — drives the NEW
  // badges. Frozen at mount so badges stay visible for the whole visit; the
  // persist step below clears them only for the *next* time the gallery opens.
  const [gallerySeen] = useState<Set<string>>(readGallerySeen)

  const unlockedCount = endings.filter((c) => c.unlocked).length
  const summerCount = summer.filter((c) => c.unlocked).length

  // On mount, persist all currently-unlocked CGs as seen (so badges clear next
  // visit) without touching the render snapshot above.
  useEffect(() => {
    const unlockedIds = [...endings, ...summer].filter((c) => c.unlocked).map((c) => c.eventId)
    if (unlockedIds.length > 0) markGallerySeen(unlockedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderTile = (cg: CG, lockedNote: string) => {
    const isNew = cg.unlocked && !gallerySeen.has(cg.eventId)
    return (
      <button
        key={cg.eventId}
        disabled={!cg.unlocked}
        onClick={() => cg.unlocked && setZoom(cg)}
        className="relative overflow-hidden rounded-xl bg-panel text-left ring-1 ring-white/10 transition enabled:hover:ring-amber/50 disabled:cursor-default"
      >
        {isNew && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold leading-none text-ink">
            NEW
          </span>
        )}
        <div className="aspect-video w-full bg-black/40">
          {cg.unlocked ? (
            <SmartImage
              src={assetUrl(`assets/cg/${cg.eventId}.png`)}
              alt={cg.title}
              label={cg.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-cream/30">
              ？
            </div>
          )}
        </div>
        <p className="truncate px-3 py-2 text-xs text-cream/70">{cg.unlocked ? cg.title : lockedNote}</p>
      </button>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-ink text-cream">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h1 className="text-xl font-bold">
          CG 갤러리 <span className="text-sm font-normal text-cream/50">{unlockedCount}/{endings.length}</span>
        </h1>
        <button
          onClick={() => setScreen('title')}
          className="rounded-lg bg-panel px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-panel/70"
        >
          타이틀로
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Ending CGs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {endings.map((cg) => renderTile(cg, '잠김'))}
        </div>

        {/* Summer bonus CGs (19+) */}
        <div className="mt-8 mb-3 flex items-center gap-2 border-t border-white/10 pt-5">
          <h2 className="text-lg font-bold">여름 보너스 ☀</h2>
          <span className="rounded bg-rose/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-soft ring-1 ring-rose/30">
            19+
          </span>
          <span className="text-sm text-cream/50">{summerCount}/{summer.length}</span>
        </div>
        <p className="mb-3 text-xs text-cream/40">각 캐릭터의 엔딩에 도달하면 해금됩니다.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summer.map((cg) => renderTile(cg, '루트 클리어 시 해금'))}
        </div>
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
            src={assetUrl(`assets/cg/${zoom.eventId}.png`)}
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
