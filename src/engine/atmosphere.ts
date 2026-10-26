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
 * Fallback scoring for the common/friendship scenes. Romance routes use
 * scoreForScene to prioritize narrative beats and individual themes.
 */
export type BgmTrack = 'day' | 'evening' | 'night' | 'tense' | 'confession' | 'jian' | 'narae' | 'seoha' | 'iseo'

export function bgmTrack(mood?: string | null): BgmTrack {
  const m = (mood ?? '').toLowerCase()
  if (/tense/.test(m)) return 'tense'
  if (/night/.test(m)) return 'night'
  if (/evening|sunset|wind|dusk/.test(m)) return 'evening'
  return 'day'
}

/** Narrative beats override time of day, then each heroine has her own theme. */
export function scoreForScene(sceneId:string,mood?:string|null):BgmTrack {
  if(/tense/.test(mood??''))return 'tense'
  if(/^(r[13]_(07|12)|r[56]_(07|11))$/.test(sceneId)||/_good$/.test(sceneId))return 'confession'
  if(/^(r1_(01|09_cinema)|r3_05(?:_\w+)?|r[56]_04(?:_\w+)?)$/.test(sceneId))return 'evening'
  if(/night/.test(mood??''))return 'night'
  const heroine:Record<string,BgmTrack>={r1:'jian',r3:'narae',r5:'seoha',r6:'iseo'}
  return heroine[sceneId.split('_')[0]]??bgmTrack(mood)
}
