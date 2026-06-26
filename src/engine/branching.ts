import { routes, thresholds, charById } from './load'
import type { Scene, EndingTier } from '../types'

export type Affection = Record<string, number>

/** Pull the flag name out of an endings condition string, e.g. flag 'jian_opened_up' set. */
function parseFlag(condition: string | undefined): string | undefined {
  if (!condition) return undefined
  return /flag '([^']+)'/.exec(condition)?.[1]
}

/** char_01 -> r1_01, char_02 -> r2_01, ... (per SCHEMA.md). */
function routeFirstScene(charId: string): string {
  const n = /(\d+)\s*$/.exec(charId)?.[1] ?? '1'
  return `r${parseInt(n, 10)}_01`
}

/**
 * BRANCH_TO_ROUTE: highest-affection character at or above route_unlock wins;
 * ties resolve to the earliest character (char_01 first). None qualify -> solo_end.
 */
export function branchToRoute(affection: Affection): string {
  let best: string | null = null
  let bestValue = -1
  for (const charId of charById.keys()) {
    const value = affection[charId] ?? 0
    if (value >= thresholds.route_unlock && value > bestValue) {
      bestValue = value
      best = charId
    }
  }
  return best ? routeFirstScene(best) : 'solo_end'
}

/**
 * EVAL_ENDING:char_xx precedence (per SCHEMA.md):
 *   bad  : affection < bad_ending_below OR bad flag set
 *   good : affection >= good_ending AND good flag set
 *   else : normal
 */
export function evalEnding(charId: string, affection: Affection, flags: string[]): string {
  const route = routes?.character_routes.find((r) => r.char_id === charId)
  const value = affection[charId] ?? 0
  const goodFlag = parseFlag(route?.endings.good.condition)
  const badFlag = parseFlag(route?.endings.bad.condition)

  let tier: EndingTier
  if (value < thresholds.bad_ending_below || (badFlag && flags.includes(badFlag))) {
    tier = 'bad'
  } else if (value >= thresholds.good_ending && (!goodFlag || flags.includes(goodFlag))) {
    tier = 'good'
  } else {
    tier = 'normal'
  }
  return `end_${charId}_${tier}`
}

/**
 * Resolve a scene's next_scene field, applying engine sentinels.
 * Returns the next scene_id, or null when the game ends (ending reached).
 */
export function resolveNext(scene: Scene, affection: Affection, flags: string[]): string | null {
  const next = scene.next_scene ?? null
  if (next === null) return null
  if (next === 'BRANCH_TO_ROUTE') return branchToRoute(affection)
  if (next.startsWith('EVAL_ENDING:')) {
    return evalEnding(next.slice('EVAL_ENDING:'.length), affection, flags)
  }
  return next
}

export function isEndingScene(sceneId: string): boolean {
  return sceneId === 'solo_end' || sceneId.startsWith('end_')
}

/** Ending scene id -> CG event_id (e.g. end_char_01_good -> char_01_good_ending). */
export function endingEventId(sceneId: string): string {
  return sceneId === 'solo_end' ? 'solo_ending' : `${sceneId.replace(/^end_/, '')}_ending`
}

export function endingSummary(sceneId: string): string {
  if (sceneId === 'solo_end') return routes?.solo_route.summary ?? ''
  const m = /^end_(char_\d+)_(good|normal|bad)$/.exec(sceneId)
  if (m && routes) {
    const route = routes.character_routes.find((r) => r.char_id === m[1])
    return route?.endings[m[2] as EndingTier].summary ?? ''
  }
  return ''
}
