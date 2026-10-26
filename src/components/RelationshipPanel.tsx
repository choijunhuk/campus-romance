import { useGame } from '../store'
import { characters } from '../engine/load'
import { CharacterSprite } from './CharacterSprite'
import { Modal } from './Modal'

export function RelationshipPanel({ onClose }: { onClose: () => void }) {
  const { affection, flags, settings } = useGame()
  return <Modal title="우리 사이" onClose={onClose}><div className="relationships">{characters.map(c => {
    const friendship = c.route_kind === 'friendship'
    const v = affection[c.id] ?? 0
    const dating = c.id === 'char_01' ? flags.includes('jian_dating') : flags.includes('narae_dating')
    const label = friendship ? v >= 40 ? '함께하는 동료' : '동아리 친구' : dating ? '마음을 확인한 사이' : v >= 40 ? '따로 약속하는 사이' : v > 0 ? '조금씩 알아가는 중' : '같은 캠퍼스의 사람'
    return <article key={c.id}><div className="relationship-portrait"><CharacterSprite charId={c.id} expression="smile" /></div><div><small>{friendship ? '우정 · 프로젝트' : '연애 이야기'}</small><h3>{c.name}</h3><p>{label}{settings.showAffection ? ` · ${v}` : ''}</p><span>{String(c.year_major ?? '')}</span></div></article>
  })}</div><p className="menu-caption">친절과 연애는 다른 마음이에요. 누구와 어떤 관계로 지낼지는 직접 고를 수 있습니다.</p></Modal>
}
