/**
 * Unit tests for pure branching functions.
 * These import from ./load only for routes/thresholds/charById,
 * which are static JSON imports that work fine in vitest node environment.
 */
import { describe, it, expect } from 'vitest'
import {
  branchToRoute,
  evalEnding,
  resolveNext,
  isEndingScene,
  endingEventId,
  endingSummary,
} from './branching'
import { thresholds } from './load'
import type { Scene } from '../types'

// ── branchToRoute ────────────────────────────────────────────────────────────

describe('branchToRoute', () => {
  it('returns solo_end when no character meets route_unlock threshold', () => {
    expect(branchToRoute({})).toBe('solo_end')
    expect(branchToRoute({ char_01: 39, char_02: 39 })).toBe('solo_end')
    expect(branchToRoute({ char_01: 0, char_02: 0, char_03: 0, char_04: 0 })).toBe('solo_end')
  })

  it('returns solo_end when all chars are exactly one below threshold', () => {
    const below = thresholds.route_unlock - 1
    expect(
      branchToRoute({ char_01: below, char_02: below, char_03: below, char_04: below }),
    ).toBe('solo_end')
  })

  it('routes to char_01 at exactly route_unlock threshold', () => {
    expect(branchToRoute({ char_01: thresholds.route_unlock })).toBe('r1_01')
  })

  it('routes to highest-affection character', () => {
    expect(branchToRoute({ char_01: 50, char_02: 80 })).toBe('r2_01')
    expect(branchToRoute({ char_01: 80, char_02: 50 })).toBe('r1_01')
    expect(branchToRoute({ char_03: 90, char_04: 60 })).toBe('r3_01')
    expect(branchToRoute({ char_04: 100 })).toBe('r4_01')
  })

  it('resolves ties to the earliest char (char_01 before char_02 etc.)', () => {
    // All equal at or above threshold → char_01 wins (earliest in charById)
    expect(
      branchToRoute({ char_01: 60, char_02: 60, char_03: 60, char_04: 60 }),
    ).toBe('r1_01')
    // char_01 absent, char_02 and char_03 tied → char_02 wins
    expect(branchToRoute({ char_02: 55, char_03: 55 })).toBe('r2_01')
    // char_01 and char_03 tied → char_01 wins
    expect(branchToRoute({ char_01: 70, char_03: 70 })).toBe('r1_01')
  })

  it('produces correct r{n}_01 scene id for each character', () => {
    expect(branchToRoute({ char_01: 50 })).toBe('r1_01')
    expect(branchToRoute({ char_02: 50 })).toBe('r2_01')
    expect(branchToRoute({ char_03: 50 })).toBe('r3_01')
    expect(branchToRoute({ char_04: 50 })).toBe('r4_01')
  })
})

// ── evalEnding ───────────────────────────────────────────────────────────────

describe('evalEnding', () => {
  const GOOD_AFF = thresholds.good_ending      // 75
  const BAD_AFF  = thresholds.bad_ending_below // 20

  describe('char_01 (jian)', () => {
    it('bad: affection below bad_ending_below threshold', () => {
      expect(evalEnding('char_01', { char_01: BAD_AFF - 1 }, [])).toBe('end_char_01_bad')
      expect(evalEnding('char_01', { char_01: 0 }, [])).toBe('end_char_01_bad')
    })

    it('bad: affection exactly at bad threshold is NOT bad (boundary)', () => {
      // condition is < 20, so 20 itself is not bad via threshold
      const result = evalEnding('char_01', { char_01: BAD_AFF }, [])
      expect(result).not.toBe('end_char_01_bad')
    })

    it('bad: bad flag set overrides affection', () => {
      expect(evalEnding('char_01', { char_01: 90 }, ['jian_pushed_away'])).toBe('end_char_01_bad')
    })

    it('good: affection >= good_ending AND good flag set', () => {
      expect(evalEnding('char_01', { char_01: GOOD_AFF }, ['jian_opened_up'])).toBe('end_char_01_good')
      expect(evalEnding('char_01', { char_01: 100 }, ['jian_opened_up'])).toBe('end_char_01_good')
    })

    it('normal: affection >= good_ending but good flag NOT set', () => {
      expect(evalEnding('char_01', { char_01: GOOD_AFF }, [])).toBe('end_char_01_normal')
    })

    it('normal: affection in range [bad_ending_below, good_ending)', () => {
      expect(evalEnding('char_01', { char_01: 50 }, [])).toBe('end_char_01_normal')
      expect(evalEnding('char_01', { char_01: GOOD_AFF - 1 }, ['jian_opened_up'])).toBe('end_char_01_normal')
    })
  })

  describe('char_02 (doyun)', () => {
    it('bad: affection below threshold', () => {
      expect(evalEnding('char_02', { char_02: 10 }, [])).toBe('end_char_02_bad')
    })

    it('bad: doyun_hurt flag overrides', () => {
      expect(evalEnding('char_02', { char_02: 80 }, ['doyun_hurt'])).toBe('end_char_02_bad')
    })

    it('good: affection >= 75 AND doyun_understood flag', () => {
      expect(evalEnding('char_02', { char_02: 80 }, ['doyun_understood'])).toBe('end_char_02_good')
    })

    it('normal: affection in range, no flags', () => {
      expect(evalEnding('char_02', { char_02: 50 }, [])).toBe('end_char_02_normal')
    })
  })

  describe('char_03 (narae)', () => {
    it('bad: affection below threshold', () => {
      expect(evalEnding('char_03', { char_03: 5 }, [])).toBe('end_char_03_bad')
    })

    it('bad: narae_collapsed flag overrides', () => {
      expect(evalEnding('char_03', { char_03: 90 }, ['narae_collapsed'])).toBe('end_char_03_bad')
    })

    it('good: affection >= 75 AND narae_unmasked flag', () => {
      expect(evalEnding('char_03', { char_03: 75 }, ['narae_unmasked'])).toBe('end_char_03_good')
    })

    it('normal: mid-range affection', () => {
      expect(evalEnding('char_03', { char_03: 45 }, [])).toBe('end_char_03_normal')
    })
  })

  describe('char_04 (sihyuk)', () => {
    it('bad: affection below threshold', () => {
      expect(evalEnding('char_04', { char_04: 0 }, [])).toBe('end_char_04_bad')
    })

    it('bad: sihyuk_too_late flag overrides', () => {
      expect(evalEnding('char_04', { char_04: 85 }, ['sihyuk_too_late'])).toBe('end_char_04_bad')
    })

    it('good: affection >= 75 AND sihyuk_confessed flag', () => {
      expect(evalEnding('char_04', { char_04: 80 }, ['sihyuk_confessed'])).toBe('end_char_04_good')
    })

    it('normal: mid-range affection', () => {
      expect(evalEnding('char_04', { char_04: 60 }, [])).toBe('end_char_04_normal')
    })
  })

  it('uses missing affection as 0 (defaults to bad tier)', () => {
    // affection[charId] ?? 0 → 0 < 20 → bad
    expect(evalEnding('char_01', {}, [])).toBe('end_char_01_bad')
  })
})

// ── resolveNext ──────────────────────────────────────────────────────────────

describe('resolveNext', () => {
  function makeScene(next_scene: string | null | undefined): Scene {
    return {
      scene_id: 'test',
      title: 'Test',
      nodes: [],
      next_scene,
    }
  }

  it('returns null when next_scene is null', () => {
    expect(resolveNext(makeScene(null), {}, [])).toBeNull()
  })

  it('returns null when next_scene is undefined', () => {
    expect(resolveNext(makeScene(undefined), {}, [])).toBeNull()
  })

  it('delegates BRANCH_TO_ROUTE to branchToRoute', () => {
    const result = resolveNext(makeScene('BRANCH_TO_ROUTE'), { char_01: 50 }, [])
    expect(result).toBe('r1_01')
  })

  it('BRANCH_TO_ROUTE → solo_end when no char qualifies', () => {
    const result = resolveNext(makeScene('BRANCH_TO_ROUTE'), {}, [])
    expect(result).toBe('solo_end')
  })

  it('delegates EVAL_ENDING:char_01 to evalEnding', () => {
    const result = resolveNext(makeScene('EVAL_ENDING:char_01'), { char_01: 80 }, ['jian_opened_up'])
    expect(result).toBe('end_char_01_good')
  })

  it('delegates EVAL_ENDING:char_02 → bad ending', () => {
    const result = resolveNext(makeScene('EVAL_ENDING:char_02'), { char_02: 10 }, [])
    expect(result).toBe('end_char_02_bad')
  })

  it('delegates EVAL_ENDING:char_03 → normal ending', () => {
    const result = resolveNext(makeScene('EVAL_ENDING:char_03'), { char_03: 50 }, [])
    expect(result).toBe('end_char_03_normal')
  })

  it('delegates EVAL_ENDING:char_04 → good ending', () => {
    const result = resolveNext(makeScene('EVAL_ENDING:char_04'), { char_04: 80 }, ['sihyuk_confessed'])
    expect(result).toBe('end_char_04_good')
  })

  it('passes plain scene id through unchanged', () => {
    expect(resolveNext(makeScene('c_02'), {}, [])).toBe('c_02')
    expect(resolveNext(makeScene('r1_01'), {}, [])).toBe('r1_01')
    expect(resolveNext(makeScene('end_char_01_good'), {}, [])).toBe('end_char_01_good')
  })
})

// ── isEndingScene ────────────────────────────────────────────────────────────

describe('isEndingScene', () => {
  it('returns true for solo_end', () => {
    expect(isEndingScene('solo_end')).toBe(true)
  })

  it('returns true for all end_* scene ids', () => {
    expect(isEndingScene('end_char_01_good')).toBe(true)
    expect(isEndingScene('end_char_02_normal')).toBe(true)
    expect(isEndingScene('end_char_03_bad')).toBe(true)
    expect(isEndingScene('end_char_04_good')).toBe(true)
  })

  it('returns false for common and route scenes', () => {
    expect(isEndingScene('c_01')).toBe(false)
    expect(isEndingScene('r1_01')).toBe(false)
    expect(isEndingScene('r4_05')).toBe(false)
  })
})

// ── endingEventId ────────────────────────────────────────────────────────────

describe('endingEventId', () => {
  it('maps solo_end to solo_ending', () => {
    expect(endingEventId('solo_end')).toBe('solo_ending')
  })

  it('strips end_ prefix and appends _ending', () => {
    expect(endingEventId('end_char_01_good')).toBe('char_01_good_ending')
    expect(endingEventId('end_char_02_normal')).toBe('char_02_normal_ending')
    expect(endingEventId('end_char_03_bad')).toBe('char_03_bad_ending')
    expect(endingEventId('end_char_04_good')).toBe('char_04_good_ending')
  })
})

// ── endingSummary ────────────────────────────────────────────────────────────

describe('endingSummary', () => {
  it('returns a non-empty string for solo_end', () => {
    expect(endingSummary('solo_end')).toBeTruthy()
  })

  it('returns a non-empty string for each character ending tier', () => {
    const ids = [
      'end_char_01_good', 'end_char_01_normal', 'end_char_01_bad',
      'end_char_02_good', 'end_char_02_normal', 'end_char_02_bad',
      'end_char_03_good', 'end_char_03_normal', 'end_char_03_bad',
      'end_char_04_good', 'end_char_04_normal', 'end_char_04_bad',
    ]
    for (const id of ids) {
      expect(endingSummary(id), `endingSummary('${id}')`).toBeTruthy()
    }
  })

  it('returns empty string for unrecognised scene id', () => {
    expect(endingSummary('c_01')).toBe('')
    expect(endingSummary('unknown')).toBe('')
  })
})
