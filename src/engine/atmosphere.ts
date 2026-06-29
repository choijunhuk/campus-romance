/**
 * Map a scene/node `bgm_mood` to the time-of-day variant of its background.
 * Backgrounds ship three variants (afternoon / evening / night, see
 * image_prompts.json); the mood string already encodes the hour, so a night
 * scene ("quiet_night") shows the night plate instead of a hardcoded afternoon.
 */
export type BgTime = 'afternoon' | 'evening' | 'night'

export function bgTime(mood?: string | null): BgTime {
  const m = (mood ?? '').toLowerCase()
  if (/night|밤/.test(m)) return 'night'
  if (/evening|sunset|dusk|noeul|노을|저녁/.test(m)) return 'evening'
  return 'afternoon'
}

/**
 * Collapse the many bgm_mood strings to a handful of BGM track names, so the
 * soundtrack needs only a few files (public/assets/bgm/{track}.mp3). Missing
 * files degrade silently — the audio hook catches the load/play error.
 */
export type BgmTrack = 'day' | 'evening' | 'night' | 'tense'

export function bgmTrack(mood?: string | null): BgmTrack {
  const m = (mood ?? '').toLowerCase()
  if (/night/.test(m)) return 'night'
  if (/tense/.test(m)) return 'tense'
  if (/evening|sunset|wind|dusk/.test(m)) return 'evening'
  return 'day'
}
