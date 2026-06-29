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
