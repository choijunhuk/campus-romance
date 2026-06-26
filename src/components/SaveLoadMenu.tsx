import { useGame, SAVE_SLOTS, type SaveData } from '../store'

function describe(data: SaveData | null): string {
  if (!data) return '— 비어 있음 —'
  const when = new Date(data.ts).toLocaleString()
  return `${data.sceneTitle} · ${data.playerName} · ${when}`
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
        className="w-full max-w-md rounded-2xl bg-slate-900 p-5 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
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
                  if (mode === 'save') save(id)
                  else if (load(id)) onClose()
                  if (mode === 'save') onClose()
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left transition enabled:hover:bg-slate-700 disabled:opacity-40"
              >
                <span className="font-medium text-teal-300">{label}</span>
                <span className="truncate text-xs text-slate-300">{describe(data)}</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-700 py-2 text-sm text-white hover:bg-slate-600"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
