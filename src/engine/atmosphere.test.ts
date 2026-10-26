import { describe, it, expect } from 'vitest'
import { bgTime, bgmTrack, scoreForScene } from './atmosphere'

describe('bgTime', () => {
  it('maps night moods to the night plate', () => {
    expect(bgTime('quiet_night')).toBe('night')
    expect(bgTime('night_city')).toBe('night')
  })

  it('maps evening/sunset moods to the evening plate', () => {
    expect(bgTime('evening_wind')).toBe('evening')
    expect(bgTime('sunset_dusk')).toBe('evening')
  })

  it('defaults to afternoon for daytime or unknown moods', () => {
    expect(bgTime('tense_afternoon')).toBe('afternoon')
    expect(bgTime('soft_afternoon')).toBe('afternoon')
    expect(bgTime(undefined)).toBe('afternoon')
    expect(bgTime(null)).toBe('afternoon')
    expect(bgTime('')).toBe('afternoon')
  })

  it('prioritises night over evening when both could match', () => {
    expect(bgTime('evening_into_night')).toBe('night')
  })
})

describe('bgmTrack', () => {
  it('maps moods to a small track set', () => {
    expect(bgmTrack('quiet_night')).toBe('night')
    expect(bgmTrack('night_city')).toBe('night')
    expect(bgmTrack('tense_afternoon')).toBe('tense')
    expect(bgmTrack('tense_night')).toBe('tense')
    expect(bgmTrack('evening_wind')).toBe('evening')
    expect(bgmTrack('soft_afternoon')).toBe('day')
    expect(bgmTrack(undefined)).toBe('day')
  })
})

describe('narrative scoring',()=>{
 it('gives every heroine a distinct theme at the same time of day',()=>{
   expect(['r1_02','r3_02','r5_02','r6_02'].map(id=>scoreForScene(id,'warm_afternoon'))).toEqual(['jian','narae','seoha','iseo'])
 })
 it('scores a date, confession and conflict before the heroine theme',()=>{
   expect(scoreForScene('r5_04_walk','warm_afternoon')).toBe('evening')
   expect(scoreForScene('r6_11','quiet_night')).toBe('confession')
   expect(scoreForScene('r5_08','tense_night')).toBe('tense')
   expect(scoreForScene('end_char_06_good','evening_wind')).toBe('confession')
 })
})
