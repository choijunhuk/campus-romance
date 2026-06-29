import { create } from 'zustand'
import { START_SCENE, scenes } from './engine/load'
import { resolveNext, isEndingScene, endingEventId } from './engine/branching'
import type { Choice } from './types'

export type Screen = 'title' | 'game' | 'gallery'

export interface SaveData {
  playerName: string
  sceneId: string
  nodeIndex: number
  // Ordered node indices actually visited in the current scene. Needed to derive
  // sprites/background correctly after branch jumps and merges (a cursor alone loses it).
  path: number[]
  affection: Record<string, number>
  flags: string[]
  seenCG: string[]
  ended: boolean
  ts: number
  sceneTitle: string
}

/** Manual slots + autosave. */
export const SAVE_SLOTS = [
  { id: 'auto', label: '자동 저장' },
  { id: 's1', label: '슬롯 1' },
  { id: 's2', label: '슬롯 2' },
  { id: 's3', label: '슬롯 3' },
] as const

const GALLERY_KEY = 'vn_gallery'
const slotKey = (slot: string) => `vn_save_${slot}`
const clamp = (v: number) => Math.max(0, Math.min(100, v))

function readGallery(): string[] {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]')
  } catch {
    return []
  }
}
function addToGallery(ids: string[]) {
  localStorage.setItem(GALLERY_KEY, JSON.stringify([...new Set([...readGallery(), ...ids])]))
}

interface GameState {
  screen: Screen
  playerName: string
  sceneId: string
  nodeIndex: number
  path: number[]
  affection: Record<string, number>
  flags: string[]
  seenCG: string[]
  ended: boolean
  showDebug: boolean

  setScreen: (screen: Screen) => void
  toggleDebug: () => void
  start: (name: string) => void
  advance: () => void
  choose: (choice: Choice) => void
  goToScene: (sceneId: string) => void

  save: (slot: string) => void
  load: (slot: string) => boolean
  listSaves: () => Record<string, SaveData | null>
  galleryIds: () => string[]
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  playerName: '',
  sceneId: START_SCENE,
  nodeIndex: 0,
  path: [0],
  affection: {},
  flags: [],
  seenCG: [],
  ended: false,
  showDebug: false,

  setScreen: (screen) => set({ screen }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),

  start: (name) => {
    set({
      screen: 'game',
      playerName: name.trim() || '주인공',
      sceneId: START_SCENE,
      nodeIndex: 0,
      affection: {},
      flags: [],
      seenCG: [],
      ended: false,
    })
    get().goToScene(START_SCENE)
  },

  advance: () => {
    const { sceneId, nodeIndex, ended } = get()
    if (ended) return
    const scene = scenes.get(sceneId)
    if (!scene) return
    // Node-level goto: narration/dialogue may jump after their line.
    // number = node index (same scene), string = scene_id. null/absent = sequential.
    const node = scene.nodes[nodeIndex]
    const goto = node && 'goto' in node ? node.goto : undefined
    if (typeof goto === 'number') {
      set({ nodeIndex: goto, path: [...get().path, goto] })
      get().save('auto')
      return
    }
    if (typeof goto === 'string') {
      get().goToScene(goto)
      return
    }
    if (nodeIndex < scene.nodes.length - 1) {
      const ni = nodeIndex + 1
      set({ nodeIndex: ni, path: [...get().path, ni] })
      get().save('auto')
    } else {
      const next = resolveNext(scene, get().affection, get().flags)
      if (next === null) {
        set({ ended: true })
        get().save('auto')
      } else {
        get().goToScene(next)
      }
    }
  },

  choose: (choice) => {
    const affection = { ...get().affection }
    if (choice.affection) {
      for (const [k, v] of Object.entries(choice.affection)) {
        affection[k] = clamp((affection[k] ?? 0) + v)
      }
    }
    const flags = [...new Set([...get().flags, ...(choice.set_flags ?? [])])]
    set({ affection, flags })

    const goto = choice.goto ?? null
    if (typeof goto === 'number') {
      set({ nodeIndex: goto, path: [...get().path, goto] })
      get().save('auto')
    } else if (typeof goto === 'string') {
      get().goToScene(goto)
    } else {
      get().advance()
    }
  },

  goToScene: (sceneId) => {
    set({ sceneId, nodeIndex: 0, path: [0], ended: false })
    if (isEndingScene(sceneId)) {
      const eventId = endingEventId(sceneId)
      set({ seenCG: [...new Set([...get().seenCG, eventId])] })
      addToGallery([eventId])
    }
    get().save('auto')
  },

  save: (slot) => {
    const s = get()
    const data: SaveData = {
      playerName: s.playerName,
      sceneId: s.sceneId,
      nodeIndex: s.nodeIndex,
      path: s.path,
      affection: s.affection,
      flags: s.flags,
      seenCG: s.seenCG,
      ended: s.ended,
      ts: Date.now(),
      sceneTitle: scenes.get(s.sceneId)?.title ?? s.sceneId,
    }
    try {
      localStorage.setItem(slotKey(slot), JSON.stringify(data))
    } catch {
      /* storage unavailable (e.g. private mode) — ignore */
    }
  },

  load: (slot) => {
    let data: SaveData | null = null
    try {
      const raw = localStorage.getItem(slotKey(slot))
      if (raw) data = JSON.parse(raw)
    } catch {
      data = null
    }
    if (!data) return false
    set({
      screen: 'game',
      playerName: data.playerName,
      sceneId: data.sceneId,
      nodeIndex: data.nodeIndex,
      // Old saves lack path → best-effort linear fallback (correct for un-branched scenes).
      path: data.path ?? Array.from({ length: (data.nodeIndex ?? 0) + 1 }, (_, i) => i),
      affection: data.affection ?? {},
      flags: data.flags ?? [],
      seenCG: data.seenCG ?? [],
      ended: data.ended ?? false,
    })
    addToGallery(data.seenCG ?? [])
    return true
  },

  listSaves: () => {
    const out: Record<string, SaveData | null> = {}
    for (const { id } of SAVE_SLOTS) {
      try {
        const raw = localStorage.getItem(slotKey(id))
        out[id] = raw ? JSON.parse(raw) : null
      } catch {
        out[id] = null
      }
    }
    return out
  },

  galleryIds: () => readGallery(),
}))
