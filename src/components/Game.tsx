import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { scenes, charById } from '../engine/load'
import { endingSummary } from '../engine/branching'
import { SmartImage, useTypewriter } from './ui'
import { SaveLoadMenu } from './SaveLoadMenu'
import type { SpritePosition } from '../types'

const BG_TIME = 'afternoon' // ponytail: assets only ship afternoon/evening/night; afternoon is the safe default

const POS_CLASS: Record<SpritePosition, string> = {
  left: 'left-2 sm:left-12',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-2 sm:right-12',
}

export function Game() {
  const sceneId = useGame((s) => s.sceneId)
  const nodeIndex = useGame((s) => s.nodeIndex)
  const ended = useGame((s) => s.ended)
  const playerName = useGame((s) => s.playerName)
  const showDebug = useGame((s) => s.showDebug)
  const affection = useGame((s) => s.affection)
  const flags = useGame((s) => s.flags)
  const advance = useGame((s) => s.advance)
  const choose = useGame((s) => s.choose)
  const toggleDebug = useGame((s) => s.toggleDebug)
  const setScreen = useGame((s) => s.setScreen)

  const [menu, setMenu] = useState<'none' | 'save' | 'load'>('none')

  const scene = scenes.get(sceneId)
  const node = scene?.nodes[nodeIndex]
  const isChoice = node?.type === 'choice'
  const lineText = node && node.type !== 'choice' ? node.text : ''
  const tw = useTypewriter(lineText, `${sceneId}:${nodeIndex}`)

  function onStage() {
    if (ended || menu !== 'none' || !node) return
    if (isChoice) return
    if (!tw.done) tw.finish()
    else advance()
  }

  // Keyboard: Space/Enter advance, backtick toggles debug.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Backquote') {
        e.preventDefault()
        toggleDebug()
        return
      }
      if ((e.code === 'Space' || e.code === 'Enter') && menu === 'none') {
        e.preventDefault()
        onStage()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, nodeIndex, ended, tw.done, isChoice, menu])

  if (!scene || !node) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-white">
        <p>씬을 찾을 수 없습니다: <code>{sceneId}</code></p>
        <button onClick={() => setScreen('title')} className="rounded-lg bg-teal-500 px-4 py-2 text-slate-900">
          타이틀로
        </button>
      </div>
    )
  }

  // Derive background + sprites deterministically from nodes[0..nodeIndex]
  // (robust against jumps and loaded saves).
  let bg = scene.background
  const sprites: Partial<Record<SpritePosition, { charId: string; expression: string }>> = {}
  for (let i = 0; i <= nodeIndex; i++) {
    const n = scene.nodes[i]
    if (n.type === 'narration' && n.background) bg = n.background
    if (n.type === 'dialogue' && n.sprite_position && n.speaker !== 'protagonist') {
      sprites[n.sprite_position] = { charId: n.speaker, expression: n.expression ?? 'neutral' }
    }
  }

  const speakerName =
    node.type === 'dialogue'
      ? node.speaker === 'protagonist'
        ? playerName
        : charById.get(node.speaker)?.name ?? node.speaker
      : ''
  const activeSpeaker = node.type === 'dialogue' ? node.speaker : null

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-slate-950">
      {/* Background */}
      {bg ? (
        <SmartImage
          src={`/assets/backgrounds/${bg}_${BG_TIME}.png`}
          alt={bg}
          label={`배경: ${bg}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
      )}

      {/* Sprites */}
      {(Object.entries(sprites) as [SpritePosition, { charId: string; expression: string }][]).map(
        ([pos, sp]) => (
          <SmartImage
            key={pos}
            src={`/assets/characters/${sp.charId}_${sp.expression}.png`}
            alt={`${sp.charId} ${sp.expression}`}
            label={`${charById.get(sp.charId)?.name ?? sp.charId}\n(${sp.expression})`}
            className={`absolute bottom-0 ${POS_CLASS[pos]} h-[70%] w-40 object-contain object-bottom transition-all duration-200 sm:w-56 ${
              activeSpeaker && activeSpeaker !== sp.charId ? 'brightness-50' : ''
            }`}
          />
        ),
      )}

      {/* Top bar */}
      <div className="absolute right-2 top-2 z-20 flex gap-2 text-xs">
        <TopButton onClick={() => setMenu('save')}>저장</TopButton>
        <TopButton onClick={() => setMenu('load')}>불러오기</TopButton>
        <TopButton onClick={toggleDebug}>디버그</TopButton>
        <TopButton onClick={() => setScreen('title')}>타이틀</TopButton>
      </div>

      {/* Click-to-advance stage (sits under the dialogue/choice UI) */}
      <button
        className="absolute inset-0 z-0 h-full w-full cursor-pointer"
        aria-label="다음"
        onClick={onStage}
      />

      {/* Dialogue / narration box */}
      {!isChoice && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 cursor-pointer p-3 sm:p-6"
          onClick={onStage}
        >
          <div className="mx-auto max-w-3xl rounded-2xl bg-slate-900/85 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur sm:p-6">
            {speakerName && (
              <p className="mb-1 text-base font-bold text-teal-300">{speakerName}</p>
            )}
            <p className="min-h-[3.5rem] text-[15px] leading-relaxed text-white sm:text-lg">
              {tw.shown}
              {tw.done && <span className="ml-1 animate-pulse text-teal-300">▼</span>}
            </p>
          </div>
        </div>
      )}

      {/* Choices */}
      {isChoice && node.type === 'choice' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
          {node.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => choose(c)}
              className="w-full max-w-lg rounded-xl bg-slate-900/90 px-5 py-3.5 text-left text-white ring-1 ring-white/15 transition hover:bg-teal-600 hover:ring-teal-300"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute left-2 top-2 z-20 max-w-[60%] rounded-lg bg-black/80 p-3 text-xs text-lime-300">
          <p className="font-bold">DEBUG (backtick to toggle)</p>
          <p>
            scene: {sceneId} · node: {nodeIndex}/{scene.nodes.length - 1}
          </p>
          <p className="mt-1 font-semibold">affection</p>
          {charById.size === 0 ? (
            <p>(no characters)</p>
          ) : (
            [...charById.values()].map((c) => (
              <p key={c.id}>
                {c.name} ({c.id}): {affection[c.id] ?? 0}
              </p>
            ))
          )}
          <p className="mt-1 font-semibold">flags</p>
          <p>{flags.length ? flags.join(', ') : '(none)'}</p>
        </div>
      )}

      {/* Ending screen */}
      {ended && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center">
          <p className="text-sm tracking-widest text-teal-300">— THE END —</p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{scene.title}</h2>
          <p className="max-w-md text-sm text-slate-300">{endingSummary(sceneId)}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setScreen('gallery')}
              className="rounded-xl bg-slate-700 px-5 py-2.5 text-white hover:bg-slate-600"
            >
              CG 갤러리
            </button>
            <button
              onClick={() => setScreen('title')}
              className="rounded-xl bg-teal-500 px-5 py-2.5 font-semibold text-slate-900 hover:bg-teal-400"
            >
              타이틀로
            </button>
          </div>
        </div>
      )}

      {menu !== 'none' && <SaveLoadMenu mode={menu} onClose={() => setMenu('none')} />}
    </div>
  )
}

function TopButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-white ring-1 ring-white/15 transition hover:bg-slate-700"
    >
      {children}
    </button>
  )
}
