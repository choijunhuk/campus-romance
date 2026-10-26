import art from './data/art.json'
import { bgTime } from './engine/atmosphere'
export const ART_ROOT = 'assets/art-v2/'
export const eventArt = art.events
export const eventById = new Map(eventArt.map((e) => [e.id, e]))
export const spriteAtlases: Record<string, string> = art.sprites
const backgroundNames: Record<string, string> = { club_room: 'workshop', gwabang: 'workshop', library: 'library', cafeteria: 'cafeteria', cafe_street: 'cafe', rooftop: 'rooftop', han_river: 'river' }
export function backgroundAsset(id: string | undefined | null, mood?: string | null) {
  if(id==='lecture_hall') return ART_ROOT + 'lecture.webp'
  const name = id ? backgroundNames[id] : null
  return name ? `${ART_ROOT}${name}-${bgTime(mood) === 'night' ? 'night' : 'day'}.webp` : `assets/backgrounds/${id}_${bgTime(mood)}.png`
}
export function expressionFrame(charId: string, expression: string) {
  const happy = ['smile', 'laugh', 'blush', 'embarrassed'].includes(expression)
  if (charId === 'char_02') return happy ? 1 : 0
  if (charId === 'char_04') return happy ? 3 : 2
  if (['smile', 'laugh'].includes(expression)) return 1
  if (['blush', 'embarrassed'].includes(expression)) return 2
  if (['sad', 'angry'].includes(expression)) return 3
  return 0
}
