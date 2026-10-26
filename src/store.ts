import { create } from 'zustand'
import { START_SCENE, scenes, charById } from './engine/load'
import { resolveNext, isEndingScene, endingEventId } from './engine/branching'
import type { Choice, Scene } from './types'
import { visibleNode, presentation } from './engine/presentation'
import { eventById } from './art'

export const STORY_VERSION = 3

export type Screen = 'title' | 'game' | 'gallery'

export interface SaveData {
  storyVersion?: number
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
  // Display metadata for the save/load menu (thumbnail + at-a-glance route).
  bg: string | null
  topChar: string | null
}

/** Manual slots + autosave. */
export const SAVE_SLOTS = [
  { id: 'auto', label: '자동 저장' },
  { id: 's1', label: '슬롯 1' },
  { id: 's2', label: '슬롯 2' },
  { id: 's3', label: '슬롯 3' },
] as const

const GALLERY_KEY = 'vn_gallery_v2'
const SETTINGS_KEY = 'vn_settings'
const SEEN_KEY = 'vn_seen'
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
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify([...new Set([...readGallery(), ...ids])]))
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

interface Settings {
  fontSize: number
  showAffection: boolean
  textSpeed: number // ms per character (lower = faster)
  autoDelay: number // ms to wait before auto-advancing a finished line
  bgmVolume: number // 0..1
  sfxVolume: number // 0..1
  muted: boolean
  skipUnread: boolean // allow SKIP to race through never-seen text too
}
const DEFAULT_SETTINGS: Settings = {
  fontSize: 19,
  showAffection: false,
  textSpeed: 22,
  autoDelay: 1200,
  bgmVolume: 0.6,
  sfxVolume: 0.7,
  muted: false,
  skipUnread: false,
}
function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    const settings = { ...DEFAULT_SETTINGS }
    const ranges = {fontSize:[16,26],textSpeed:[2,60],autoDelay:[800,5000],bgmVolume:[0,1],sfxVolume:[0,1]} as const
    for(const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
      const value=saved?.[key]
      if(typeof value==='number'&&Number.isFinite(value))settings[key]=Math.max(ranges[key][0],Math.min(ranges[key][1],value))
    }
    for(const key of ['muted','skipUnread','showAffection'] as const)if(typeof saved?.[key]==='boolean')settings[key]=saved[key]
    return settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Lines the player has already read (key = `sceneId:nodeIndex`), for skip-unread. */
function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

/** Background actually in effect at `path`'s end (per-node overrides win). */
function deriveBg(scene: Scene | undefined, path: number[]): string | null {
  if (!scene) return null
  let bg = scene.background ?? null
  for (const i of path) {
    const n = scene.nodes[i]
    if (n && (n.type === 'narration' || n.type === 'dialogue') && n.background) bg = n.background
  }
  return bg
}

/** Highest-affection character's display name, for save metadata. */
function topCharName(affection: Record<string, number>): string | null {
  let best: string | null = null
  let bestVal = 0
  for (const [id, v] of Object.entries(affection)) {
    if (v > bestVal) {
      bestVal = v
      best = id
    }
  }
  return best ? charById.get(best)?.name ?? best : null
}

export interface HistoryEntry {
  name: string
  text: string
}
export interface AffPing {
  charName: string
  delta: number
  ts: number
}
export interface CgPing {
  title: string
  ts: number
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

  // VN UX state
  history: HistoryEntry[]
  auto: boolean
  skip: boolean
  uiHidden: boolean
  settings: Settings
  affPing: AffPing | null
  cgPing: CgPing | null
  seen: Set<string>

  setScreen: (screen: Screen) => void
  toggleDebug: () => void
  start: (name: string) => void
  advance: () => void
  choose: (choice: Choice) => void
  goToScene: (sceneId: string) => void
  goToNode: (index: number) => void
  unlockCG: (id: string) => void

  pushHistory: (name: string, text: string) => void
  toggleAuto: () => void
  toggleSkip: () => void
  toggleUiHidden: () => void
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  clearPing: () => void
  clearCgPing: () => void
  markSeen: (key: string) => void

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

  history: [],
  auto: false,
  skip: false,
  uiHidden: false,
  settings: readSettings(),
  affPing: null,
  cgPing: null,
  seen: readSeen(),

  setScreen: (screen) => set({ screen }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),

  start: (name) => {
    set({
      screen: 'game',
      playerName: name.trim() || '이준',
      sceneId: START_SCENE,
      nodeIndex: 0,
      affection: {},
      flags: [],
      seenCG: [],
      ended: false,
      history: [],
      auto: false,
      skip: false,
      uiHidden: false,
      affPing: null,
      cgPing: null,
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
    if (node?.type === 'choice') return
    const goto = node && 'goto' in node ? node.goto : undefined
    if (typeof goto === 'number') {
      get().goToNode(goto)
      return
    }
    if (typeof goto === 'string') {
      get().goToScene(goto)
      return
    }
    if (nodeIndex < scene.nodes.length - 1) {
      const ni = nodeIndex + 1
      get().goToNode(ni)
    } else {
      const next = resolveNext(scene, get().affection, get().flags)
      if (next === null) {
        set({ ended: true, skip: false, auto: false })
        get().save('auto')
      } else {
        get().goToScene(next)
      }
    }
  },

  choose: (choice) => {
    const current = scenes.get(get().sceneId)?.nodes[get().nodeIndex]
    if (current?.type !== 'choice' || !current.choices.includes(choice)) return
    const affection = { ...get().affection }
    let pingChar: string | null = null
    let pingDelta = 0
    if (choice.affection) {
      for (const [k, v] of Object.entries(choice.affection)) {
        affection[k] = clamp((affection[k] ?? 0) + v)
        // Surface the most significant single swing as feedback.
        if (Math.abs(v) > Math.abs(pingDelta)) {
          pingDelta = v
          pingChar = k
        }
      }
    }
    const flags = [...new Set([...get().flags.filter((f) => !choice.clear_flags?.includes(f)), ...(choice.set_flags ?? [])])]
    const affPing = pingChar
      ? { charName: charById.get(pingChar)?.name ?? pingChar, delta: pingDelta, ts: Date.now() }
      : get().affPing
    // Choosing breaks any skip/auto run so the player sees the consequence.
    set({ affection, flags, affPing, skip: false, auto: false })
    get().pushHistory('선택', choice.label)

    const goto = choice.goto ?? null
    if (typeof goto === 'number') {
      get().goToNode(goto)
    } else if (typeof goto === 'string') {
      get().goToScene(goto)
    } else {
      get().goToNode(get().nodeIndex + 1)
    }
  },

  goToScene: (sceneId) => {
    if (!scenes.has(sceneId)) return
    set({ sceneId, nodeIndex: 0, path: [], ended: false })
    if (isEndingScene(sceneId)) {
      const eventId = endingEventId(sceneId)
      // Detect whether this CG is being unlocked for the first time this session.
      const isNew = !get().seenCG.includes(eventId) && !readGallery().includes(eventId)
      set({ seenCG: [...new Set([...get().seenCG, eventId])] })
      addToGallery([eventId])
      if (isNew) {
        const sceneTitle = scenes.get(sceneId)?.title ?? sceneId
        set({ cgPing: { title: sceneTitle, ts: Date.now() } })
      }
    }
    get().goToNode(0)
  },

  goToNode: (start) => {
    const scene = scenes.get(get().sceneId)
    if (!scene) return
    const index = visibleNode(scene, start, get().flags)
    if (index >= scene.nodes.length) {
      const next = resolveNext(scene, get().affection, get().flags)
      if (next) get().goToScene(next)
      else set({ ended: true, auto: false, skip: false })
    } else {
      const path = [...get().path, index]
      set({ nodeIndex: index, path })
      const cg = presentation(scene, path).cg
      if (cg) get().unlockCG(cg)
    }
    get().save('auto')
  },

  unlockCG: (id) => {
    const entry = eventById.get(id)
    if (!entry) return
    const isNew = !readGallery().includes(id)
    set({ seenCG: [...new Set([...get().seenCG, id])] })
    addToGallery([id])
    if (isNew) set({ cgPing: { title: entry.title, ts: Date.now() } })
  },

  pushHistory: (name, text) => {
    const h = get().history
    const lastEntry = h[h.length - 1]
    if (lastEntry && lastEntry.name === name && lastEntry.text === text) return // dedupe re-renders
    const next = [...h, { name, text }]
    set({ history: next.length > 800 ? next.slice(next.length - 800) : next })
  },

  toggleAuto: () => set((s) => ({ auto: !s.auto, skip: false })),
  toggleSkip: () => set((s) => ({ skip: !s.skip, auto: false })),
  toggleUiHidden: () => set((s) => ({ uiHidden: !s.uiHidden })),
  setSetting: (key, value) => {
    const settings = { ...get().settings, [key]: value }
    set({ settings })
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  },
  clearPing: () => set({ affPing: null }),
  clearCgPing: () => set({ cgPing: null }),
  markSeen: (key) => {
    if (get().seen.has(key)) return
    const seen = new Set(get().seen)
    seen.add(key)
    set({ seen })
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
    } catch {
      /* storage unavailable — ignore */
    }
  },

  save: (slot) => {
    const s = get()
    const scene = scenes.get(s.sceneId)
    const data: SaveData = {
      storyVersion: STORY_VERSION,
      playerName: s.playerName,
      sceneId: s.sceneId,
      nodeIndex: s.nodeIndex,
      path: s.path,
      affection: s.affection,
      flags: s.flags,
      seenCG: s.seenCG,
      ended: s.ended,
      ts: Date.now(),
      sceneTitle: scene?.title ?? s.sceneId,
      bg: deriveBg(scene, s.path),
      topChar: topCharName(s.affection),
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
    // Validate the shape before trusting it (corrupt/legacy/foreign localStorage).
    if (!data || typeof data.sceneId !== 'string' || !scenes.has(data.sceneId)) return false
    if (data.storyVersion !== STORY_VERSION || !Number.isInteger(data.nodeIndex) || data.nodeIndex < 0 || data.nodeIndex >= scenes.get(data.sceneId)!.nodes.length) return false
    if (typeof data.playerName !== 'string' || !Array.isArray(data.path) || data.path[data.path.length-1] !== data.nodeIndex || data.path.some(i => !Number.isInteger(i) || i<0 || i>=scenes.get(data!.sceneId)!.nodes.length)) return false
    set({
      screen: 'game',
      playerName: data.playerName,
      sceneId: data.sceneId,
      nodeIndex: data.nodeIndex,
      // Old saves lack path → best-effort linear fallback (correct for un-branched scenes).
      path: Array.isArray(data.path)
        ? data.path
        : Array.from({ length: (data.nodeIndex ?? 0) + 1 }, (_, i) => i),
      affection: Object.fromEntries([...charById.keys()].map(id => [id, typeof data!.affection?.[id]==='number' ? clamp(data!.affection[id]) : 0])),
      flags: Array.isArray(data.flags) ? data.flags.filter(f => typeof f==='string') : [],
      seenCG: Array.isArray(data.seenCG) ? data.seenCG.filter(f => typeof f==='string') : [],
      ended: data.ended ?? false,
      history: [],
      auto: false,
      skip: false,
      uiHidden: false,
      affPing: null,
      cgPing: null,
    })
    addToGallery(get().seenCG)
    return true
  },

  listSaves: () => {
    const out: Record<string, SaveData | null> = {}
    for (const { id } of SAVE_SLOTS) {
      try {
        const raw = localStorage.getItem(slotKey(id))
        const candidate = raw ? JSON.parse(raw) : null
        out[id] = candidate && typeof candidate==='object' && typeof candidate.sceneId==='string' && typeof candidate.sceneTitle==='string' && typeof candidate.playerName==='string' && typeof candidate.ts==='number' ? candidate : null
      } catch {
        out[id] = null
      }
    }
    return out
  },

  galleryIds: () => readGallery(),
}))
