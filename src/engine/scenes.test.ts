/**
 * Integration tests over the REAL loaded scene data.
 *
 * import.meta.glob is a Vite-only transform that doesn't run in vitest's node
 * environment, so we load scene JSON files directly with fs/path — same data,
 * no glob needed.  The branching helpers (evalEnding, branchToRoute) come from
 * the pure branching module which has no glob dependency.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { SceneSchema } from '../types'
import type { Scene } from '../types'
import { evalEnding, branchToRoute, isEndingScene } from './branching'
import { thresholds } from './load'

// ── Load real scene data ─────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCENES_DIR = join(__dirname, '../data/scenes')

function loadAllScenes(): Map<string, Scene> {
  const map = new Map<string, Scene>()
  const files = readdirSync(SCENES_DIR).filter((f: string) => f.endsWith('.json'))
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(SCENES_DIR, file), 'utf-8'))
    const result = SceneSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(`Scene file ${file} failed schema validation: ${result.error.message}`)
    }
    map.set(result.data.scene_id, result.data)
  }
  return map
}

let scenes: Map<string, Scene>

beforeAll(() => {
  scenes = loadAllScenes()
})

// ── Sentinel detection helpers ───────────────────────────────────────────────

const SENTINEL_BRANCH = 'BRANCH_TO_ROUTE'
const SENTINEL_EVAL   = /^EVAL_ENDING:char_\d+$/

function isSentinel(s: string): boolean {
  return s === SENTINEL_BRANCH || SENTINEL_EVAL.test(s)
}

// ── Basic existence ──────────────────────────────────────────────────────────

describe('scene map basics', () => {
  it('loads at least one scene', () => {
    expect(scenes.size).toBeGreaterThan(0)
  })

  it("START_SCENE 'c_01' exists in the map", () => {
    expect(scenes.has('c_01')).toBe(true)
  })

  it('contains all 13 expected ending scenes', () => {
    const chars = ['char_01', 'char_02', 'char_03', 'char_04']
    const tiers = ['good', 'normal', 'bad']
    for (const char of chars) {
      for (const tier of tiers) {
        const id = `end_${char}_${tier}`
        expect(scenes.has(id), `missing scene ${id}`).toBe(true)
      }
    }
    expect(scenes.has('solo_end'), 'missing scene solo_end').toBe(true)
  })
})

// ── Node-level goto bounds ───────────────────────────────────────────────────

describe('goto index bounds', () => {
  it('every numeric goto is within [0, nodes.length-1] for its scene', () => {
    for (const [sceneId, scene] of scenes) {
      const len = scene.nodes.length
      scene.nodes.forEach((node, idx) => {
        // narration / dialogue nodes may have a goto field
        if (node.type === 'narration' || node.type === 'dialogue') {
          const g = (node as { goto?: number | string | null }).goto
          if (typeof g === 'number') {
            expect(
              g,
              `${sceneId} node[${idx}] goto=${g} out of bounds (len=${len})`,
            ).toBeGreaterThanOrEqual(0)
            expect(
              g,
              `${sceneId} node[${idx}] goto=${g} out of bounds (len=${len})`,
            ).toBeLessThanOrEqual(len - 1)
          }
        }
        // choice nodes
        if (node.type === 'choice') {
          node.choices.forEach((choice, ci) => {
            const g = choice.goto
            if (typeof g === 'number') {
              expect(
                g,
                `${sceneId} node[${idx}] choice[${ci}] goto=${g} out of bounds (len=${len})`,
              ).toBeGreaterThanOrEqual(0)
              expect(
                g,
                `${sceneId} node[${idx}] choice[${ci}] goto=${g} out of bounds (len=${len})`,
              ).toBeLessThanOrEqual(len - 1)
            }
          })
        }
      })
    }
  })

  it('every string goto on a node or choice resolves to a known scene or is a sentinel', () => {
    for (const [sceneId, scene] of scenes) {
      scene.nodes.forEach((node, idx) => {
        if (node.type === 'narration' || node.type === 'dialogue') {
          const g = (node as { goto?: number | string | null }).goto
          if (typeof g === 'string') {
            expect(
              scenes.has(g) || isSentinel(g),
              `${sceneId} node[${idx}] string goto='${g}' not in scene map and not a sentinel`,
            ).toBe(true)
          }
        }
        if (node.type === 'choice') {
          node.choices.forEach((choice, ci) => {
            if (typeof choice.goto === 'string') {
              expect(
                scenes.has(choice.goto) || isSentinel(choice.goto),
                `${sceneId} node[${idx}] choice[${ci}] string goto='${choice.goto}' not in scene map`,
              ).toBe(true)
            }
          })
        }
      })
    }
  })
})

// ── next_scene validity ──────────────────────────────────────────────────────

describe('next_scene validity', () => {
  it('every next_scene is null, a sentinel, or a scene id in the map', () => {
    for (const [sceneId, scene] of scenes) {
      const ns = scene.next_scene
      if (ns == null) continue
      expect(
        scenes.has(ns) || isSentinel(ns),
        `${sceneId}.next_scene='${ns}' not in map and not a sentinel`,
      ).toBe(true)
    }
  })
})

// ── Intra-scene node reachability ────────────────────────────────────────────

describe('intra-scene node reachability (no dead nodes)', () => {
  /**
   * Build a reachability set starting from node 0 within a scene.
   * Follows numeric gotos; all other nodes fall through to node+1 implicitly.
   * Choice nodes branch across all choices.
   */
  function reachableNodes(scene: Scene): Set<number> {
    const reached = new Set<number>()
    const queue = [0]
    while (queue.length > 0) {
      const i = queue.shift()!
      if (i < 0 || i >= scene.nodes.length || reached.has(i)) continue
      reached.add(i)
      const node = scene.nodes[i]
      if (node.type === 'choice') {
        for (const choice of node.choices) {
          const g = choice.goto
          if (g == null) {
            queue.push(i + 1)
          } else if (typeof g === 'number') {
            queue.push(g)
          }
          // string gotos jump to a different scene — terminal for this scene
        }
      } else {
        // narration or dialogue
        const g = (node as { goto?: number | string | null }).goto
        if (g == null) {
          queue.push(i + 1)          // implicit fallthrough
        } else if (typeof g === 'number') {
          queue.push(g)
        }
        // string goto → different scene, terminal
      }
    }
    return reached
  }

  it('every node in every scene is reachable from node 0', () => {
    for (const [sceneId, scene] of scenes) {
      if (scene.nodes.length === 0) continue
      const reached = reachableNodes(scene)
      scene.nodes.forEach((_, idx) => {
        expect(
          reached.has(idx),
          `${sceneId}: node[${idx}] is unreachable from node 0`,
        ).toBe(true)
      })
    }
  })
})

// ── Playthrough ending reachability ─────────────────────────────────────────

describe('ending reachability via branching engine', () => {
  const UNLOCK = thresholds.route_unlock   // 40
  const GOOD   = thresholds.good_ending    // 75
  const BAD    = thresholds.bad_ending_below // 20

  // Confirm all 13 ending scene ids exist and are marked as ending scenes
  it('all 13 ending scene ids satisfy isEndingScene()', () => {
    const chars = ['char_01', 'char_02', 'char_03', 'char_04']
    for (const char of chars) {
      for (const tier of ['good', 'normal', 'bad']) {
        expect(isEndingScene(`end_${char}_${tier}`)).toBe(true)
      }
    }
    expect(isEndingScene('solo_end')).toBe(true)
  })

  // solo_end: no character at route_unlock
  it('branchToRoute → solo_end when no char reaches route_unlock', () => {
    const result = branchToRoute({ char_01: UNLOCK - 1, char_02: 0 })
    expect(result).toBe('solo_end')
    expect(scenes.has('solo_end')).toBe(true)
  })

  // Each character: good / normal / bad ending selectable via evalEnding
  const CHAR_FLAGS: Record<string, { good: string; bad: string }> = {
    char_01: { good: 'jian_opened_up',   bad: 'jian_pushed_away' },
    char_02: { good: 'doyun_understood', bad: 'doyun_hurt' },
    char_03: { good: 'narae_unmasked',   bad: 'narae_collapsed' },
    char_04: { good: 'sihyuk_confessed', bad: 'sihyuk_too_late' },
  }

  for (const [char, flags] of Object.entries(CHAR_FLAGS)) {
    const charNum = char.split('_')[1] // '01', '02', ...

    it(`${char}: affection ${GOOD} + good flag → good ending (scene exists)`, () => {
      const result = evalEnding(char, { [char]: GOOD }, [flags.good])
      expect(result).toBe(`end_${char}_good`)
      expect(scenes.has(result), `scene ${result} missing`).toBe(true)
    })

    it(`${char}: affection ${GOOD - 1} (no flag) → normal ending (scene exists)`, () => {
      const result = evalEnding(char, { [char]: GOOD - 1 }, [])
      expect(result).toBe(`end_${char}_normal`)
      expect(scenes.has(result), `scene ${result} missing`).toBe(true)
    })

    it(`${char}: affection ${BAD - 1} → bad ending (scene exists)`, () => {
      const result = evalEnding(char, { [char]: BAD - 1 }, [])
      expect(result).toBe(`end_${char}_bad`)
      expect(scenes.has(result), `scene ${result} missing`).toBe(true)
    })

    it(`${char}: bad flag set overrides high affection → bad ending (scene exists)`, () => {
      const result = evalEnding(char, { [char]: 90 }, [flags.bad])
      expect(result).toBe(`end_${char}_bad`)
      expect(scenes.has(result), `scene ${result} missing`).toBe(true)
    })

    it(`branchToRoute: ${char} at ${UNLOCK} wins when others are 0 → r${charNum}_01 exists`, () => {
      const result = branchToRoute({ [char]: UNLOCK })
      expect(result).toBe(`r${parseInt(charNum, 10)}_01`)
      expect(scenes.has(result), `scene ${result} missing`).toBe(true)
    })
  }
})
