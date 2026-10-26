import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { ART_ROOT, eventArt } from '../art'
import { scenes } from '../engine/load'
import { endingEventId } from '../engine/branching'
import { SmartImage, assetUrl } from './ui'

const SEEN_KEY = 'vn_gallery_seen_v2'
function seenIds(): string[] { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') } catch { return [] } }
export function Gallery() {
  const { setScreen, galleryIds } = useGame()
  const unlocked = new Set(galleryIds())
  const [seen, setSeen] = useState(seenIds)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState<(typeof eventArt)[number] | null>(null)
  const previousFocus=useRef<HTMLElement|null>(null)
  useEffect(()=>{if(zoom)return ()=>previousFocus.current?.focus()},[zoom])
  const open = (entry: (typeof eventArt)[number]) => {
    previousFocus.current=document.activeElement as HTMLElement
    setZoom(entry)
    const next = [...new Set([...seen, entry.id])]
    setSeen(next)
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)) } catch { /* private browsing */ }
  }
  const entries = eventArt.filter(e => filter === 'all' || e.character === filter)
  const endings = [...scenes.values()].filter(s => s.scene_id.startsWith('end_') || s.scene_id === 'solo_end')
  return <main className="gallery-screen">
    <header className="collection-header"><div><p className="eyebrow">AFTER THE SPRING</p><h1>기억에 남은 장면</h1><p>함께 보낸 시간들을 다시 꺼내보세요. <span>{eventArt.filter(e => unlocked.has(e.id)).length} / {eventArt.length}</span></p></div><button className="quiet-button" onClick={() => setScreen('title')}>타이틀로 ↗</button></header>
    <nav className="gallery-filters" aria-label="인물별 장면">{[['all','모든 장면'],['char_01','서지안'],['char_03','유나래']].map(([id,name]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{name}</button>)}</nav>
    <div className="gallery-grid">{entries.map((entry,i) => <button key={entry.id} className="gallery-card" disabled={!unlocked.has(entry.id)} onClick={() => open(entry)}>
      <div className="gallery-image">{unlocked.has(entry.id) ? <SmartImage src={assetUrl(ART_ROOT + entry.file)} alt={entry.title} className="h-full w-full object-cover" /> : <div className="locked-art"><span>0{i+1}</span><small>아직 만나지 않은 순간</small></div>}{unlocked.has(entry.id) && !seen.includes(entry.id) && <span className="new-mark">NEW</span>}</div>
      <p>{unlocked.has(entry.id) ? entry.title : '아직 쓰지 않은 장면'}<small>{unlocked.has(entry.id) ? (entry.character === 'char_01' ? '서지안' : '유나래') : entry.hint}</small></p>
    </button>)}</div>
    <details className="ending-collection"><summary>지나온 결말 <span>{endings.filter(s => unlocked.has(endingEventId(s.scene_id))).length} / {endings.length}</span></summary><div>{endings.map(s => <p key={s.scene_id}>{unlocked.has(endingEventId(s.scene_id)) ? s.title : '아직 쓰지 않은 마지막 페이지'}</p>)}</div></details>
    {zoom && <div className="image-viewer" role="dialog" aria-modal="true" aria-label={zoom.title} onClick={() => setZoom(null)} onKeyDown={e => { if(e.key==='Escape')setZoom(null);if(e.key==='Tab')e.preventDefault() }}><button autoFocus className="viewer-close" onClick={() => setZoom(null)}>닫기 ×</button><SmartImage src={assetUrl(ART_ROOT + zoom.file)} alt={zoom.title} className="viewer-image" /><p>{zoom.title}</p></div>}
  </main>
}
