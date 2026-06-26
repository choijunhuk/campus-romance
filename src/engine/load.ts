import worldRaw from '../data/world_bible.json'
import charsRaw from '../data/characters.json'
import routesRaw from '../data/routes.json'
import {
  WorldBibleSchema,
  CharactersSchema,
  RoutesSchema,
  SceneSchema,
  type Scene,
  type Character,
} from '../types'
import { demoScenes } from './demo'

/** Human-readable validation errors surfaced in the UI (never throws). */
export const loadErrors: string[] = []

function validate<T>(schema: { safeParse: (v: unknown) => any }, raw: unknown, label: string): T | null {
  const r = schema.safeParse(raw)
  if (!r.success) {
    const issues = r.error.issues
      .map((i: any) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    loadErrors.push(`${label} — ${issues}`)
    return null
  }
  return r.data as T
}

/* ── Singleton data files ────────────────────────────────────────────────── */

export const world = validate<ReturnType<typeof WorldBibleSchema.parse>>(
  WorldBibleSchema,
  worldRaw,
  'world_bible.json',
)
export const characters: Character[] =
  validate<Character[]>(CharactersSchema, charsRaw, 'characters.json') ?? []
export const routes =
  validate<ReturnType<typeof RoutesSchema.parse>>(RoutesSchema, routesRaw, 'routes.json')

export const charById = new Map(characters.map((c) => [c.id, c]))

export const thresholds = routes?.affection_system.thresholds ?? {
  route_unlock: 40,
  good_ending: 75,
  bad_ending_below: 20,
}

/* ── Scenes via data-driven glob (add a JSON file = add a scene) ──────────── */

const sceneModules = import.meta.glob('../data/scenes/*.json', { eager: true })

const loadedScenes: Scene[] = []
for (const [path, mod] of Object.entries(sceneModules)) {
  const raw = (mod as { default?: unknown }).default ?? mod
  const r = SceneSchema.safeParse(raw)
  if (!r.success) {
    const issues = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    loadErrors.push(`${path} — ${issues}`)
    continue
  }
  loadedScenes.push(r.data)
}

/** True when no real scene files were found and the bundled demo is in use. */
export const usingDemo = loadedScenes.length === 0
const activeScenes = usingDemo ? demoScenes : loadedScenes

export const scenes = new Map<string, Scene>(activeScenes.map((s) => [s.scene_id, s]))

/** First scene to play. Common-route start is `c_01` per routes.json. */
export const START_SCENE: string = scenes.has('c_01')
  ? 'c_01'
  : (scenes.keys().next().value ?? 'c_01')
