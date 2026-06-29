import { useEffect, useRef, useState } from 'react'

/**
 * Image that falls back to a labeled placeholder box instead of a broken
 * image / crash when the asset file is missing.
 */
export function SmartImage({
  src,
  alt,
  className = '',
  label,
}: {
  src: string
  alt: string
  className?: string
  label?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center border border-white/15 bg-slate-700/60 px-2 text-center text-[11px] leading-tight text-slate-200 ${className}`}
      >
        {label ?? alt}
      </div>
    )
  }
  return (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} draggable={false} />
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

/**
 * Looping background music for the current track. Missing files degrade
 * silently (browsers reject .play() / fire an error, which we swallow).
 * Audio only starts after a user gesture per autoplay policy — by the time
 * a track is set in-game the player has already clicked, so it's fine.
 */
export function useBgm(track: string | null, volume: number, muted: boolean) {
  const ref = useRef<HTMLAudioElement | null>(null)
  if (ref.current === null && typeof Audio !== 'undefined') {
    ref.current = new Audio()
    ref.current.loop = true
  }

  useEffect(() => {
    const a = ref.current
    return () => {
      if (a) a.pause()
    }
  }, [])

  useEffect(() => {
    const a = ref.current
    if (!a) return
    if (!track) {
      a.pause()
      return
    }
    const src = `/assets/bgm/${track}.mp3`
    if (!a.src.endsWith(src)) {
      a.src = src
      a.play().catch(() => {
        /* missing file or autoplay blocked — stay silent */
      })
    }
  }, [track])

  useEffect(() => {
    const a = ref.current
    if (a) a.volume = muted ? 0 : Math.max(0, Math.min(1, volume))
  }, [volume, muted])
}

/** Fire-and-forget one-shot sound effect (public/assets/sfx/{name}.mp3). */
export function playSfx(name: string, volume: number) {
  if (typeof Audio === 'undefined' || volume <= 0) return
  try {
    const a = new Audio(`/assets/sfx/${name}.mp3`)
    a.volume = Math.max(0, Math.min(1, volume))
    a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}
