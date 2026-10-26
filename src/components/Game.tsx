import { useEffect, useRef, useState } from 'react'
import { useGame, STORY_VERSION } from '../store'
import { scenes, charById } from '../engine/load'
import { endingSummary } from '../engine/branching'
import { presentation } from '../engine/presentation'
import { bgTime, scoreForScene } from '../engine/atmosphere'
import soundtrack from '../data/soundtrack.json'
import { ART_ROOT, eventById, spriteAtlases, backgroundAsset } from '../art'
import { SmartImage, useTypewriter, useBgm, playSfx, assetUrl } from './ui'
import { CharacterSprite } from './CharacterSprite'
import { SaveLoadMenu } from './SaveLoadMenu'
import { RelationshipPanel } from './RelationshipPanel'
import { Modal } from './Modal'

type Menu = 'none' | 'main' | 'save' | 'load' | 'log' | 'settings' | 'relationship'
export function Game() {
  const game = useGame()
  const { sceneId, nodeIndex, path, flags, affection, ended, playerName, settings, history, auto, skip, uiHidden, affPing, cgPing, showDebug } = game
  const scene = scenes.get(sceneId)
  const node = scene?.nodes[nodeIndex]
  const stage = scene ? presentation(scene, path) : null
  const [menu, setMenu] = useState<Menu>('none')
  const [returnToTitle, setReturnToTitle] = useState(false)
  const isChoice = node?.type === 'choice'
  const tw = useTypewriter(node && node.type !== 'choice' ? node.text : '', `${sceneId}:${nodeIndex}`, settings.textSpeed)
  const seenKey = `${STORY_VERSION}:${sceneId}:${nodeIndex}`
  const wasSeen = useRef(false)
  const speaker = node?.type === 'dialogue' ? node.speaker : null
  const speakerName = speaker === 'protagonist' ? playerName : speaker ? charById.get(speaker)?.name ?? speaker : ''
  const cg = stage?.cg ? eventById.get(stage.cg) : null
  const background = stage?.background
  const track=scoreForScene(sceneId,stage?.mood)
  useBgm(track, settings.bgmVolume, settings.muted)
  const advance = () => {
    if (uiHidden) { game.toggleUiHidden(); return }
    if (ended || menu !== 'none' || returnToTitle || isChoice) return
    if (tw.done) game.advance(); else tw.finish()
  }
  useEffect(() => {
    wasSeen.current = useGame.getState().seen.has(seenKey)
    if (!node || node.type === 'choice') return
    game.pushHistory(speakerName, node.text)
    game.markSeen(seenKey)
  // Reading state is sampled before marking the line, once per visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenKey])
  useEffect(() => {
    if (!auto || isChoice || ended || !tw.done || menu !== 'none' || uiHidden) return
    const timer = setTimeout(game.advance, Math.max(settings.autoDelay, (node && 'text' in node ? node.text.length : 0) * 32))
    return () => clearTimeout(timer)
  }, [auto, isChoice, ended, tw.done, menu, uiHidden, settings.autoDelay, node, game.advance])
  useEffect(() => {
    if (!skip || isChoice || ended || menu !== 'none' || uiHidden) return
    if (!wasSeen.current && !settings.skipUnread) { game.toggleSkip(); return }
    const timer = setTimeout(() => tw.done ? game.advance() : tw.finish(), 35)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, isChoice, ended, menu, uiHidden, tw.done, seenKey, settings.skipUnread])
  useEffect(() => {
    if (!cgPing) return
    const timer = setTimeout(game.clearCgPing, 2500)
    return () => clearTimeout(timer)
  }, [cgPing, game.clearCgPing])
  useEffect(() => {
    if (!affPing) return
    const timer = setTimeout(game.clearPing, 1600)
    return () => clearTimeout(timer)
  }, [affPing, game.clearPing])
  useEffect(() => {
    const files = [...Object.values(spriteAtlases).map(f => ART_ROOT + f), ...[...eventById.values()].map(e => ART_ROOT + e.file)]
    for (const file of new Set(files)) { const img = new Image(); img.src = assetUrl(file) }
  }, [])
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (returnToTitle) setReturnToTitle(false)
        else if (menu !== 'none') setMenu('none')
        else if (uiHidden) game.toggleUiHidden()
        else setMenu('main')
        return
      }
      if (menu !== 'none' || returnToTitle || /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName) || e.repeat) return
      if ((e.code==='Space'||e.code==='Enter') && (e.target as HTMLElement).tagName==='BUTTON') return
      if (e.code === 'Backquote') game.toggleDebug()
      else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance() }
      else if (e.code === 'KeyA') game.toggleAuto()
      else if (e.code === 'KeyH') game.toggleUiHidden()
      else if (e.code === 'ControlLeft' || e.code === 'ControlRight') game.toggleSkip()
      else if (isChoice && /^Digit[1-9]$/.test(e.code) && node?.type === 'choice') {
        const choice = node.choices[Number(e.code.slice(-1)) - 1]
        if (choice) game.choose(choice)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  if (!scene || !node) return <div className="empty-state"><p>이 장면을 불러올 수 없습니다.</p><button onClick={() => game.setScreen('title')}>타이틀로</button></div>
  const focusChar = speaker && speaker !== 'protagonist' ? speaker : null
  const sprites = Object.entries(stage?.sprites ?? {})
  const choicePrompt = [...path].reverse().map(i => scene.nodes[i]).find(n => n.type === 'narration')
  return <main className={`game-stage ${cg ? 'has-cg' : ''}`} data-time={bgTime(stage?.mood)} data-hidden={uiHidden} style={{'--cg-focus':cg?.mobile_focus??'50% 50%'} as React.CSSProperties}>
    <SmartImage key={cg?.file ?? `${background}:${bgTime(stage?.mood)}`}
      src={assetUrl(cg ? ART_ROOT + cg.file : backgroundAsset(background, stage?.mood))}
      fallbackSrc={assetUrl('assets/art-v2/campus.webp')} alt={cg?.title ?? '캠퍼스 풍경'} className={`stage-background ${cg ? 'cg-art' : ''}`} />
    <div className="stage-shade" />
    {!cg && sprites.map(([position, sprite]) => sprite && <CharacterSprite key={sprite.charId} charId={sprite.charId} expression={sprite.expression}
      className={`stage-character at-${position} ${focusChar && focusChar !== sprite.charId ? 'is-listening' : ''}`} />)}
    <button className="advance-stage" onClick={advance} aria-label={uiHidden ? 'UI 다시 보기' : '다음 대사'} tabIndex={-1} />
    {!uiHidden && <>
      <header className="game-header">
        <div className="chapter-label"><span>{scene.chapter}</span><small>{scene.date} <i> / </i> {scene.title}</small><small className="now-playing" data-track={track}>{settings.muted?'♪ 음소거':`♫ ${soundtrack.find(t=>t.id===track)?.title}`}</small></div>
        <nav aria-label="플레이 조작">
          <button onClick={game.toggleAuto} aria-pressed={auto}>자동</button>
          <button onClick={game.toggleSkip} aria-pressed={skip}>스킵</button>
          <button onClick={() => setMenu('log')}>로그</button>
          <button onClick={() => setMenu('main')} aria-label="게임 메뉴 열기">메뉴 <span aria-hidden="true">☰</span></button>
        </nav>
      </header>
      {!isChoice ? <button className={`dialogue ${speaker ? '' : 'narration'}`} onClick={advance} aria-label="대사를 마치거나 다음으로 진행">
        <span className="speaker-name">{speakerName || '과방 너머 봄'}<span>{speakerName ? '대화' : '이야기'}</span></span>
        <span className="dialogue-text" style={{ fontSize: `${settings.fontSize}px` }}>{tw.shown}</span>
        <span className="dialogue-footer"><span>{tw.done ? '클릭 또는 Space' : '클릭하면 전체 보기'}</span><span aria-hidden="true">{tw.done ? '다음 →' : '· · ·'}</span></span>
      </button> : <section className="choices" aria-label="어떻게 할까">
        {choicePrompt && 'text' in choicePrompt && <p className="choice-context">{choicePrompt.text}</p>}
        <p className="choice-heading">어떻게 할까 <span>정답보다, 당신의 마음대로.</span></p>
        {node.type === 'choice' && node.choices.map((choice, i) => <button key={choice.label} onClick={() => { playSfx('select', settings.muted ? 0 : settings.sfxVolume); game.choose(choice) }}>
          <span className="choice-number">0{i + 1}</span><span>{choice.label}</span><span aria-hidden="true">↗</span>
        </button>)}
      </section>}
    </>}
    {uiHidden && <p className="hidden-hint">클릭 또는 H / Esc로 대사창 보기</p>}
    {cgPing && <p role="status" className="memory-toast">기억에 남은 장면 <span>{cgPing.title}</span></p>}
    {settings.showAffection && affPing && <p className="affection-toast">{affPing.charName} {affPing.delta > 0 ? '+' : ''}{affPing.delta}</p>}
    {showDebug && <pre className="debug-panel">{sceneId} : {nodeIndex}\n{JSON.stringify(affection)}\n{flags.join(', ')}</pre>}
    {menu === 'main' && <Modal title="잠깐 쉬어가기" onClose={() => setMenu('none')}>
      <p className="menu-caption">{scene.title} · {scene.date}</p>
      <div className="menu-grid">
        <button onClick={() => setMenu('save')}>저장하기 <small>현재 장면을 남겨두기</small></button>
        <button onClick={() => setMenu('load')}>불러오기 <small>이전 장면으로 돌아가기</small></button>
        <button onClick={() => setMenu('relationship')}>우리 사이 <small>인물과 관계 살펴보기</small></button>
        <button onClick={() => setMenu('settings')}>읽기 설정 <small>글자·속도·소리</small></button>
        <button onClick={() => { setMenu('none'); game.toggleUiHidden() }}>장면 감상 <small>대사창 잠깐 숨기기</small></button>
        <button onClick={() => { setMenu('none'); setReturnToTitle(true) }}>타이틀로 <small>자동 저장 후 나가기</small></button>
      </div>
    </Modal>}
    {returnToTitle && <Modal title="타이틀로 돌아갈까요?" onClose={() => setReturnToTitle(false)}><p>현재 장면은 자동 저장되어 있어요.</p><div className="action-row"><button className="primary-button" onClick={() => { game.save('auto'); game.setScreen('title') }}>타이틀로 돌아가기</button><button className="quiet-button" onClick={() => setReturnToTitle(false)}>계속 읽기</button></div></Modal>}
    {menu === 'log' && <Modal title="지나온 대화" onClose={() => setMenu('none')}><div className="backlog">{history.map((line, i) => <article key={i}>{line.name && <strong>{line.name}</strong>}<p>{line.text}</p></article>)}</div></Modal>}
    {menu === 'settings' && <Modal title="읽기 설정" onClose={() => setMenu('none')}><SettingsBody /></Modal>}
    {menu === 'relationship' && <RelationshipPanel onClose={() => setMenu('none')} />}
    {(menu === 'save' || menu === 'load') && <SaveLoadMenu mode={menu} onClose={() => setMenu('none')} />}
    {ended && <div className="ending-screen"><small>그해 봄의 마지막 페이지</small><h1>{scene.title}</h1><p>{endingSummary(sceneId)}</p><div className="action-row"><button className="primary-button" onClick={() => game.setScreen('gallery')}>남겨진 장면 보기</button><button className="quiet-button" onClick={() => game.setScreen('title')}>타이틀로</button></div></div>}
  </main>
}

export function SettingsBody() {
  const { settings, setSetting } = useGame()
  return <div className="settings-body">
    <label>글자 크기 <output>{settings.fontSize}px</output><input type="range" min="16" max="26" value={settings.fontSize} onChange={e => setSetting('fontSize', +e.target.value)} /></label>
    <p className="text-preview" style={{ fontSize: settings.fontSize }}>수요일 저녁 다음에도, 너와 만나고 싶어.</p>
    <label>대사 표시 속도 <output>{settings.textSpeed <= 10 ? '빠르게' : settings.textSpeed >= 40 ? '천천히' : '보통'}</output><input type="range" min="2" max="60" step="2" value={settings.textSpeed} onChange={e => setSetting('textSpeed', +e.target.value)} /></label>
    <label>자동 진행 대기 <output>{(settings.autoDelay / 1000).toFixed(1)}초 이상</output><input type="range" min="800" max="5000" step="200" value={settings.autoDelay} onChange={e => setSetting('autoDelay', +e.target.value)} /></label>
    <label>음악 <output>{Math.round(settings.bgmVolume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={settings.bgmVolume} onChange={e => setSetting('bgmVolume', +e.target.value)} /></label>
    <label>효과음 <output>{Math.round(settings.sfxVolume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={settings.sfxVolume} onChange={e => setSetting('sfxVolume', +e.target.value)} /></label>
    <label className="check-label"><input type="checkbox" checked={settings.muted} onChange={e => setSetting('muted', e.target.checked)} />소리 끄기</label>
    <label className="check-label"><input type="checkbox" checked={settings.skipUnread} onChange={e => setSetting('skipUnread', e.target.checked)} />안 읽은 대사도 스킵하기</label>
    <label className="check-label"><input type="checkbox" checked={settings.showAffection} onChange={e => setSetting('showAffection', e.target.checked)} />선택 후 관계 수치 표시</label>
    <p className="menu-caption">Space 진행 · A 자동 · Ctrl 스킵 · H 장면 감상 · Esc 메뉴 · 숫자 1–7 선택</p>
  </div>
}
