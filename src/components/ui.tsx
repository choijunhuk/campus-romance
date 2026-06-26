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
