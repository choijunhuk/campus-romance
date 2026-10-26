import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = ref.current!
    const focusable = () => [...box.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]')]
    focusable()[0]?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); close.current() }
      if (e.key !== 'Tab') return
      const all = focusable(), first = all[0], last = all[all.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    box.addEventListener('keydown', key)
    return () => { box.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
      <header><h2>{title}</h2><button className="quiet-button" onClick={onClose} aria-label={`${title} 닫기`}>닫기 <span aria-hidden="true">×</span></button></header>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}
