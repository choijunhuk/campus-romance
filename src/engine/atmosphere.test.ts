import { describe, it, expect } from 'vitest'
import { bgTime } from './atmosphere'

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
