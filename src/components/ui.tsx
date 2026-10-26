import { useEffect, useRef, useState } from 'react'
import { ambient, selectionSound } from '../engine/audio'

/**
 * Resolve a public asset path against Vite's base URL. Hardcoded "/assets/…"
 * strings DON'T get the base prefix automatically, so on GitHub Pages
 * (base "/campus-romance/") they'd 404. Always wrap asset paths with this.
 */
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/**
 * Image that falls back to a labeled placeholder box instead of a broken
 * image / crash when the asset file is missing.
 */
export function SmartImage({
  src,
  alt,
  className = '',
  label,
  fallbackSrc,
}: {
  src: string
  alt: string
  className?: string
  label?: string
  fallbackSrc?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (failed) {
    return (
      <div
        role="img" aria-label={alt}
        className={`image-fallback ${className}`}
      >
        <span className="sr-only">{label ?? alt}</span>
      </div>
    )
  }
  return (
    <img src={src} alt={alt} className={className} onError={(e) => {
      if (fallbackSrc && e.currentTarget.dataset.fallback !== 'true') {
        e.currentTarget.dataset.fallback = 'true'
        e.currentTarget.src = fallbackSrc
      } else setFailed(true)
    }} draggable={false} />
  )
}

/**
 * Typewriter reveal. `dep` should uniquely identify the current line so the
 * effect replays even when two consecutive lines share identical text.
 */
export function useTypewriter(text: string, dep: string, speed = 22) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)
  const fullRef = useRef(text)
  fullRef.current = text

  useEffect(() => {
    setShown('')
    setDone(false)
    if (!text) {
      setDone(true)
      return
    }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])

  const finish = () => {
    setShown(fullRef.current)
    setDone(true)
  }
  return { shown, done, finish }
}

/** Quiet original Web Audio accompaniment, started by entering the story. */
export function useBgm(track: string | null, volume: number, muted: boolean) {
  const player=useRef<ReturnType<typeof ambient>>(null)
  const level=useRef(muted?0:volume)
  level.current=muted?0:volume
  useEffect(()=>{
    if(!track)return
    player.current=ambient(track)
    player.current?.volume(level.current)
    return ()=>{player.current?.stop();player.current=null}
  },[track])
  useEffect(()=>{player.current?.volume(muted?0:volume)},[volume,muted])
}

/** Short synthesized feedback; no external media request. */
export function playSfx(name: string, volume: number) {
  if(name==='select')selectionSound(volume)
}
