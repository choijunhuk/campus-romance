import { ART_ROOT, spriteAtlases, expressionFrame } from '../art'
import { assetUrl } from './ui'

export function CharacterSprite({ charId, expression = 'neutral', className = '' }: { charId: string; expression?: string; className?: string }) {
  const frame = expressionFrame(charId, expression)
  return <div aria-hidden="true" className={`character-sprite ${className}`} style={{
    backgroundImage: `url("${assetUrl(ART_ROOT + spriteAtlases[charId])}")`,
    backgroundPosition: `${frame % 2 ? 100 : 0}% ${frame > 1 ? 100 : 0}%`,
  }} />
}
