import { useGame } from '../store'
import { characters } from '../engine/load'

/** Affection tier label + bar colour (mirrors routes.json thresholds). */
function tierOf(v: number): { label: string; color: string } {
  if (v >= 75) return { label: '특별한 사이', color: 'bg-rose' }
  if (v >= 40) return { label: '호감', color: 'bg-amber' }
  if (v >= 20) return { label: '관심', color: 'bg-teal' }
  return { label: '서먹함', color: 'bg-cream/40' }
}

export function RelationshipPanel({ onClose }: { onClose: () => void }) {
  const affection = useGame((s) => s.affection)

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-ink p-5 shadow-2xl ring-1 ring-amber/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cream">관계</h2>
          <button onClick={onClose} className="rounded-lg bg-panel px-3 py-1 text-sm text-cream hover:bg-panel/70">
            닫기
          </button>
        </div>
        <div className="space-y-4">
          {characters.map((c) => {
            const v = affection[c.id] ?? 0
            const t = tierOf(v)
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-cream">{c.name}</span>
                  <span className="text-xs text-cream/60">{t.label} · {v}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
                  <div
                    className={`h-full rounded-full ${t.color} transition-all duration-500`}
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            )
          })}
          {characters.length === 0 && (
            <p className="text-sm text-cream/50">캐릭터 데이터를 불러오지 못했습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
