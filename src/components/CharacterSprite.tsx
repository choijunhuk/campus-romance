import { ART_ROOT, spriteAtlases, expressionFrame, spriteRows } from '../art'
import { assetUrl } from './ui'

export function CharacterSprite({ charId, expression = 'neutral', className = '' }: { charId: string; expression?: string; className?: string }) {
  const frame = expressionFrame(charId, expression)
  const rows=spriteRows(charId)
  return <div aria-hidden="true" className={`character-sprite ${className}`} style={{
    backgroundImage: `url("${assetUrl(ART_ROOT + spriteAtlases[charId])}")`,
    backgroundSize:`200% ${rows*100}%`,
    backgroundPosition: `${frame % 2 ? 100 : 0}% ${Math.floor(frame/2)/(rows-1)*100}%`,
  }} />
}
