import { useGame, SAVE_SLOTS, type SaveData } from '../store'
import { world, scenes } from '../engine/load'
import { bgTime } from '../engine/atmosphere'
import { SmartImage } from './ui'

/** background id -> Korean location name (from world_bible). */
const LOC_NAME: Record<string, string> = Object.fromEntries(
  (world?.setting.key_locations ?? []).map((l) => [l.id, l.name]),
)

function metaLine(data: SaveData): string {
  const when = new Date(data.ts).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const loc = data.bg ? LOC_NAME[data.bg] ?? data.bg : null
  const parts = [data.playerName, loc, data.topChar ? `♥ ${data.topChar}` : null, when].filter(
    Boolean,
  )
  return parts.join(' · ')
}

export function SaveLoadMenu({
  mode,
  onClose,
}: {
  mode: 'save' | 'load'
  onClose: () => void
}) {
  const listSaves = useGame((s) => s.listSaves)
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const saves = listSaves()

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-ink p-5 shadow-2xl ring-1 ring-amber/20"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-cream">
          {mode === 'save' ? '저장하기' : '불러오기'}
        </h2>
        <div className="space-y-2">
          {SAVE_SLOTS.map(({ id, label }) => {
            const data = saves[id]
            const disabled = mode === 'load' && !data
            return (
              <button
                key={id}
                disabled={disabled}
                onClick={() => {
                  if (mode === 'save') {
                    save(id)
                    onClose()
                  } else if (load(id)) onClose()
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-panel px-3 py-2.5 text-left ring-1 ring-white/10 transition enabled:hover:bg-panel/70 disabled:opacity-40"
              >
                {/* thumbnail */}
                <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
                  {data?.bg && (
                    <SmartImage
                      src={`/assets/backgrounds/${data.bg}_${bgTime(scenes.get(data.sceneId)?.bgm_mood)}.png`}
                      alt={data.bg}
                      label="…"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-rose-soft">{label}</p>
                  {data ? (
                    <>
                      <p className="truncate text-xs text-cream/90">{data.sceneTitle}</p>
                      <p className="truncate text-[11px] text-cream/50">{metaLine(data)}</p>
                    </>
                  ) : (
                    <p className="text-xs text-cream/40">— 비어 있음 —</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-panel py-2 text-sm text-cream hover:bg-panel/70"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
