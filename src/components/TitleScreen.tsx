import { useState } from 'react'
import { useGame, STORY_VERSION } from '../store'
import { loadErrors } from '../engine/load'
import { SmartImage, assetUrl } from './ui'
import { SaveLoadMenu } from './SaveLoadMenu'
import { CharacterSprite } from './CharacterSprite'
import { Modal } from './Modal'
import { SettingsBody } from './Game'
import { characters } from '../engine/load'

export function TitleScreen() {
  const { start, load, setScreen, listSaves } = useGame()
  const [name, setName] = useState('')
  const heroines=characters.filter(c=>c.route_kind==='romance')
  const [heroine,setHeroine]=useState('char_01')
  const featured=heroines.find(c=>c.id===heroine)!
  const [menu, setMenu] = useState<'none' | 'name' | 'load' | 'settings'>('none')
  const auto = listSaves().auto
  const canContinue = auto?.storyVersion === STORY_VERSION
  return <main className="title-screen">
    <header className="title-header"><span className="brand-mark">회로의 봄 <i>—</i> CAMPUS ROMANCE</span><span>2026 / SPRING & SUMMER</span></header>
    <section className="title-hero">
      <div className="title-copy">
        <p className="eyebrow">복학한 봄, 아직 쓰지 않은 이야기</p>
        <h1>과방 너머<span>봄<span className="title-period">.</span></span></h1>
        <p className="title-description">함께 일하던 사람을, 조금 다르게 보기 시작했다.<br />수요일 저녁 다음의 약속은 누구와 할까.</p>
        <div className="title-actions">
          {canContinue && <button className="continue-button" onClick={() => load('auto')}><span>이야기 이어 읽기<small>{auto.sceneTitle}</small></span><span aria-hidden="true">↗</span></button>}
          <button className="start-button" onClick={() => setMenu('name')}><span>{canContinue ? '새로운 봄 시작하기' : '이야기 시작하기'}</span><span aria-hidden="true">→</span></button>
          <div className="title-secondary"><button onClick={() => setMenu('load')}>저장한 이야기</button><button onClick={() => setScreen('gallery')}>장면 모음</button><button onClick={() => setMenu('settings')}>읽기 설정</button></div>
        </div>
        <div className="heroine-picker" aria-label="히로인 미리 보기">{heroines.map(c=><button key={c.id} onClick={()=>setHeroine(c.id)} aria-pressed={heroine===c.id} style={{'--heroine-accent':String(c.accent)} as React.CSSProperties}><span>{c.name}</span><small>{String(c.archetype)}</small></button>)}</div>
        <p className="title-note">4명의 히로인, 서로 다른 봄. / 도윤·시혁과의 우정 이야기</p>
      </div>
      <div className="title-art" aria-hidden="true">
        <SmartImage src={assetUrl('assets/art-v2/campus.webp')} alt="봄날의 캠퍼스" className="title-campus" />
        <span className="art-vertical">그해 봄, 우리는 조금 더 솔직해졌다.</span>
        <CharacterSprite key={heroine} charId={heroine} expression="smile" className="title-featured" />
        <div className="heroine-caption" style={{'--heroine-accent':String(featured.accent)} as React.CSSProperties}><strong>{featured.name}</strong><span>{String(featured.tagline)}</span></div>
        <div className="art-caption"><span>03 — 06</span><span>한울대학교 · 회로의 봄</span></div>
      </div>
    </section>
    <footer className="title-footer"><span>연애의 속도는 직접 고릅니다.</span><span>성인 대학생들의 로맨스 · 입맞춤·관계 갈등 포함</span><span>STORY EDITION 03</span></footer>
    {loadErrors.length > 0 && <p role="alert">이야기 데이터를 확인해주세요: {loadErrors.join('; ')}</p>}
    {menu === 'name' && <Modal title="이번 봄의 이름" onClose={() => setMenu('none')}><form onSubmit={e => { e.preventDefault(); start(name) }}><label className="name-label" htmlFor="player-name">주인공 이름 <small>24세 · 전기전자공학부 3학년 복학생</small></label><input autoComplete="off" id="player-name" value={name} onChange={e => setName(e.target.value)} placeholder="이준" maxLength={12} className="name-input" /><p className="menu-caption">비워두면 이준으로 시작합니다. 연애 경로는 이야기 안에서 직접 고를 수 있어요.</p><button className="primary-button full-width" type="submit">407호 문 열기 →</button></form></Modal>}
    {menu === 'load' && <SaveLoadMenu mode="load" onClose={() => setMenu('none')} />}
    {menu === 'settings' && <Modal title="읽기 설정" onClose={() => setMenu('none')}><SettingsBody /></Modal>}
  </main>
}
