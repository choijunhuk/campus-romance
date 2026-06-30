import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { scenes, charById } from '../engine/load'
import { endingSummary, isEndingScene, endingEventId } from '../engine/branching'
import { bgTime, bgmTrack } from '../engine/atmosphere'
import { SmartImage, useTypewriter, useBgm, playSfx, assetUrl } from './ui'
import { SaveLoadMenu } from './SaveLoadMenu'
import { RelationshipPanel } from './RelationshipPanel'
import type { SpritePosition } from '../types'

const POS_CLASS: Record<SpritePosition, string> = {
  left: 'left-2 sm:left-12',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-2 sm:right-12',
}

export function Game() {
  const sceneId = useGame((s) => s.sceneId)
  const nodeIndex = useGame((s) => s.nodeIndex)
  const path = useGame((s) => s.path)
  const ended = useGame((s) => s.ended)
  const playerName = useGame((s) => s.playerName)
  const showDebug = useGame((s) => s.showDebug)
  const affection = useGame((s) => s.affection)
  const flags = useGame((s) => s.flags)
  const auto = useGame((s) => s.auto)
  const skip = useGame((s) => s.skip)
  const uiHidden = useGame((s) => s.uiHidden)
  const settings = useGame((s) => s.settings)
  const history = useGame((s) => s.history)
  const affPing = useGame((s) => s.affPing)
  const cgPing = useGame((s) => s.cgPing)
  const seen = useGame((s) => s.seen)
  const markSeen = useGame((s) => s.markSeen)
  const setSetting = useGame((s) => s.setSetting)
  const advance = useGame((s) => s.advance)
  const choose = useGame((s) => s.choose)
  const toggleDebug = useGame((s) => s.toggleDebug)
  const toggleAuto = useGame((s) => s.toggleAuto)
  const toggleSkip = useGame((s) => s.toggleSkip)
  const toggleUiHidden = useGame((s) => s.toggleUiHidden)
  const pushHistory = useGame((s) => s.pushHistory)
  const clearPing = useGame((s) => s.clearPing)
  const clearCgPing = useGame((s) => s.clearCgPing)
  const setScreen = useGame((s) => s.setScreen)

  const [menu, setMenu] = useState<'none' | 'save' | 'load' | 'log' | 'settings' | 'relationship'>(
    'none',
  )
  // Whether the current line had been read in a PRIOR visit (snapshot taken
  // before we mark it seen) — drives skip-unread.
  const wasSeenRef = useRef(false)

  // BGM for the current scene mood (track derived independently of the render
  // path so this hook stays above the early return).
  const bgmMood = (() => {
    const sc = scenes.get(sceneId)
    if (!sc) return null
    let m = sc.bgm_mood
    for (const i of path) {
      const n = sc.nodes[i]
      if (n?.type === 'narration' && n.bgm_mood) m = n.bgm_mood
    }
    return m
  })()
  useBgm(bgmMood ? bgmTrack(bgmMood) : null, settings.bgmVolume, settings.muted)

  const scene = scenes.get(sceneId)
  const node = scene?.nodes[nodeIndex]
  const isChoice = node?.type === 'choice'
  const lineText = node && node.type !== 'choice' ? node.text : ''
  const tw = useTypewriter(lineText, `${sceneId}:${nodeIndex}`, settings.textSpeed)

  const speakerName =
    node?.type === 'dialogue'
      ? node.speaker === 'protagonist'
        ? playerName
        : charById.get(node.speaker)?.name ?? node.speaker
      : ''

  function onStage() {
    if (uiHidden) {
      toggleUiHidden() // first click just brings the UI back
      return
    }
    if (ended || menu !== 'none' || !node || isChoice) return
    if (!tw.done) tw.finish()
    else advance()
  }

  // Record each shown line into the backlog + mark it read (snapshot prior
  // seen-state first, so skip-unread can tell first-reads from re-reads).
  useEffect(() => {
    const key = `${sceneId}:${nodeIndex}`
    wasSeenRef.current = seen.has(key)
    if (!node || node.type === 'choice') return
    pushHistory(speakerName, node.text)
    markSeen(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, nodeIndex])

  // Auto-advance: wait autoDelay after the line finishes, then advance.
  useEffect(() => {
    if (!auto || isChoice || ended || !tw.done || menu !== 'none') return
    const id = setTimeout(() => advance(), settings.autoDelay)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, isChoice, ended, tw.done, settings.autoDelay, sceneId, nodeIndex, menu])

  // Skip: race through lines (finish typewriter, then advance) until a choice/end.
  // Unless skipUnread is on, skipping halts when it reaches never-before-read text.
  useEffect(() => {
    if (!skip || isChoice || ended || menu !== 'none') return
    if (!wasSeenRef.current && !settings.skipUnread) {
      toggleSkip() // hit unread text — stop skipping
      return
    }
    const id = setTimeout(() => (tw.done ? advance() : tw.finish()), 28)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, isChoice, ended, tw.done, sceneId, nodeIndex, menu, settings.skipUnread])

  // Affection feedback toast auto-dismiss.
  useEffect(() => {
    if (!affPing) return
    const id = setTimeout(() => clearPing(), 1800)
    return () => clearTimeout(id)
  }, [affPing?.ts, affPing, clearPing])

  // CG unlock toast auto-dismiss.
  useEffect(() => {
    if (!cgPing) return
    const id = setTimeout(() => clearCgPing(), 2200)
    return () => clearTimeout(id)
  }, [cgPing?.ts, cgPing, clearCgPing])

  // Keyboard: Space/Enter advance, Esc closes overlays, A=auto, Ctrl=skip, H=hide, backtick=debug.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Backquote') {
        e.preventDefault()
        toggleDebug()
        return
      }
      if (e.code === 'Escape') {
        if (menu !== 'none') setMenu('none')
        else if (uiHidden) toggleUiHidden()
        return
      }
      if (menu !== 'none') return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        onStage()
      } else if (e.code === 'KeyA') {
        toggleAuto()
      } else if (e.code === 'KeyH') {
        toggleUiHidden()
      } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        toggleSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, nodeIndex, ended, tw.done, isChoice, menu, uiHidden])

  if (!scene || !node) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ink p-6 text-center text-cream">
        <p>씬을 찾을 수 없습니다: <code>{sceneId}</code></p>
        <button onClick={() => setScreen('title')} className="rounded-lg bg-rose px-4 py-2 text-ink">
          타이틀로
        </button>
      </div>
    )
  }

  // Derive background + sprites from the actually-visited path (robust against
  // branch jumps/merges and loaded saves — a linear 0..nodeIndex scan would pull
  // in sibling-branch sprites at merge nodes).
  let bg = scene.background
  let mood = scene.bgm_mood
  const sprites: Partial<Record<SpritePosition, { charId: string; expression: string }>> = {}
  for (const i of path) {
    const n = scene.nodes[i]
    if (!n) continue
    if ((n.type === 'narration' || n.type === 'dialogue') && n.background) bg = n.background
    if (n.type === 'narration' && n.bgm_mood) mood = n.bgm_mood
    if (n.type === 'dialogue' && n.sprite_position && n.speaker !== 'protagonist') {
      sprites[n.sprite_position] = { charId: n.speaker, expression: n.expression ?? 'neutral' }
    }
  }
  const time = bgTime(mood) // night/evening/afternoon plate from the scene's mood

  const activeSpeaker = node.type === 'dialogue' ? node.speaker : null
  // On ending scenes the unlocked event CG becomes the backdrop (sprites are
  // suppressed) so the finale plays over its illustration, not a stock location.
  const endingCG = isEndingScene(sceneId) ? endingEventId(sceneId) : null

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-ink">
      {/* Background — ending CG on finales, else the location art */}
      {endingCG ? (
        <SmartImage
          src={assetUrl(`assets/cg/${endingCG}.png`)}
          alt={endingCG}
          label={scene.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : bg ? (
        <SmartImage
          key={`${bg}_${time}`}
          src={assetUrl(`assets/backgrounds/${bg}_${time}.png`)}
          alt={bg}
          label={`배경: ${bg}`}
          className="absolute inset-0 h-full w-full animate-bgfade object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-panel to-ink" />
      )}

      {/* Sprites (hidden on ending scenes so the CG reads clean) */}
      {!endingCG &&
        (Object.entries(sprites) as [SpritePosition, { charId: string; expression: string }][]).map(
        ([pos, sp]) => (
          <SmartImage
            key={pos}
            src={assetUrl(`assets/characters/${sp.charId}_${sp.expression}.png`)}
            alt={`${sp.charId} ${sp.expression}`}
            label={`${charById.get(sp.charId)?.name ?? sp.charId}\n(${sp.expression})`}
            className={`absolute bottom-0 ${POS_CLASS[pos]} h-[70%] w-40 object-contain object-bottom transition-all duration-200 sm:w-56 ${
              activeSpeaker && activeSpeaker !== sp.charId ? 'brightness-50' : ''
            }`}
          />
        ),
      )}

      {/* Click-to-advance stage (sits under the dialogue/choice UI) */}
      <button
        className="absolute inset-0 z-0 h-full w-full cursor-pointer"
        aria-label="다음"
        onClick={onStage}
      />

      {/* Affection feedback toast */}
      {affPing && (
        <div
          key={affPing.ts}
          className="animate-afffloat pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full bg-panel/90 px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-white/10"
        >
          <span className={affPing.delta >= 0 ? 'text-rose-soft' : 'text-teal-soft'}>
            {affPing.delta >= 0 ? '♥' : '···'} {affPing.charName} {affPing.delta >= 0 ? '+' : ''}
            {affPing.delta}
          </span>
        </div>
      )}

      {/* CG unlock toast */}
      {cgPing && (
        <div
          key={cgPing.ts}
          className="animate-cgfloat pointer-events-none absolute left-1/2 top-6 z-20 rounded-full bg-panel/90 px-5 py-2 text-sm font-semibold shadow-lg ring-1 ring-amber/30"
        >
          <span className="text-amber-soft">✦ CG 획득 — {cgPing.title}</span>
        </div>
      )}

      {/* Top bar */}
      {!uiHidden && (
        <div className="absolute right-2 top-2 z-20 flex flex-wrap justify-end gap-1.5 text-xs">
          <TopButton active={auto} onClick={toggleAuto}>AUTO</TopButton>
          <TopButton active={skip} onClick={toggleSkip}>SKIP</TopButton>
          <TopButton onClick={() => setMenu('log')}>로그</TopButton>
          <TopButton onClick={() => setMenu('relationship')}>관계</TopButton>
          <TopButton active={settings.muted} onClick={() => setSetting('muted', !settings.muted)}>
            {settings.muted ? '🔇' : '🔊'}
          </TopButton>
          <TopButton onClick={toggleUiHidden}>숨기기</TopButton>
          <TopButton onClick={() => setMenu('settings')}>설정</TopButton>
          <TopButton onClick={() => setMenu('save')}>저장</TopButton>
          <TopButton onClick={() => setMenu('load')}>불러오기</TopButton>
          <TopButton onClick={() => setScreen('title')}>타이틀</TopButton>
        </div>
      )}

      {/* Dialogue / narration box */}
      {!isChoice && !uiHidden && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 cursor-pointer p-3 sm:p-6"
          onClick={onStage}
        >
          <div className="mx-auto max-w-3xl rounded-2xl bg-panel/90 p-4 shadow-xl ring-1 ring-amber/20 backdrop-blur sm:p-6">
            {speakerName && (
              <p className="mb-1 text-base font-bold text-amber-soft">{speakerName}</p>
            )}
            <p className="min-h-[3.5rem] text-[15px] leading-relaxed text-cream sm:text-lg">
              {tw.shown}
              {tw.done && <span className="ml-1 animate-pulse text-amber">▼</span>}
            </p>
          </div>
        </div>
      )}

      {/* Choices */}
      {isChoice && node.type === 'choice' && !uiHidden && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
          {node.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                playSfx('select', settings.sfxVolume)
                choose(c)
              }}
              className="w-full max-w-lg rounded-xl bg-panel/95 px-5 py-3.5 text-left text-cream ring-1 ring-white/15 transition hover:bg-rose hover:text-ink hover:ring-rose-soft"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Hidden-UI hint */}
      {uiHidden && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-panel/70 px-3 py-1 text-xs text-cream/70">
          UI 숨김 — 클릭 또는 Esc로 복귀
        </p>
      )}

      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute left-2 top-2 z-20 max-w-[60%] rounded-lg bg-black/80 p-3 text-xs text-lime-300">
          <p className="font-bold">DEBUG (backtick to toggle)</p>
          <p>
            scene: {sceneId} · node: {nodeIndex}/{scene.nodes.length - 1} · path: {path.join('→')}
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

      {/* Backlog */}
      {menu === 'log' && (
        <Overlay title="대사 로그" onClose={() => setMenu('none')}>
          {history.length === 0 ? (
            <p className="text-sm text-cream/60">아직 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i}>
                  {h.name && <p className="text-xs font-bold text-amber-soft">{h.name}</p>}
                  <p className="text-sm leading-relaxed text-cream/90">{h.text}</p>
                </div>
              ))}
            </div>
          )}
        </Overlay>
      )}

      {/* Settings */}
      {menu === 'settings' && (
        <Overlay title="설정" onClose={() => setMenu('none')}>
          <SettingsBody />
        </Overlay>
      )}

      {/* Relationship meter */}
      {menu === 'relationship' && <RelationshipPanel onClose={() => setMenu('none')} />}

      {/* Ending screen */}
      {ended && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center">
          <p className="text-sm tracking-widest text-amber-soft">— THE END —</p>
          <h2 className="text-2xl font-bold text-cream sm:text-3xl">{scene.title}</h2>
          <p className="max-w-md text-sm text-cream/70">{endingSummary(sceneId)}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setScreen('gallery')}
              className="rounded-xl bg-panel px-5 py-2.5 text-cream ring-1 ring-white/15 hover:bg-panel/70"
            >
              CG 갤러리
            </button>
            <button
              onClick={() => setScreen('title')}
              className="rounded-xl bg-rose px-5 py-2.5 font-semibold text-ink hover:bg-rose-soft"
            >
              타이틀로
            </button>
          </div>
        </div>
      )}

      {(menu === 'save' || menu === 'load') && (
        <SaveLoadMenu mode={menu} onClose={() => setMenu('none')} />
      )}
    </div>
  )
}

function TopButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 ring-1 transition ${
        active
          ? 'bg-rose text-ink ring-rose-soft'
          : 'bg-panel/85 text-cream ring-white/15 hover:bg-panel'
      }`}
    >
      {children}
    </button>
  )
}

function Overlay({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80%] w-full max-w-md flex-col rounded-2xl bg-ink p-5 shadow-2xl ring-1 ring-amber/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cream">{title}</h2>
          <button onClick={onClose} className="rounded-lg bg-panel px-3 py-1 text-sm text-cream hover:bg-panel/70">
            닫기
          </button>
        </div>
        <div className="overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}

function SettingsBody() {
  const settings = useGame((s) => s.settings)
  const setSetting = useGame((s) => s.setSetting)
  return (
    <div className="space-y-5 text-cream">
      <label className="block">
        <div className="mb-1 flex justify-between text-sm">
          <span>텍스트 속도</span>
          <span className="text-cream/60">{settings.textSpeed <= 6 ? '빠름' : settings.textSpeed >= 40 ? '느림' : '보통'}</span>
        </div>
        {/* slider is inverted: left = fast (low ms), right = slow */}
        <input
          type="range"
          min={2}
          max={60}
          step={2}
          value={settings.textSpeed}
          onChange={(e) => setSetting('textSpeed', Number(e.target.value))}
          className="w-full accent-rose"
        />
      </label>
      <label className="block">
        <div className="mb-1 flex justify-between text-sm">
          <span>자동 진행 대기</span>
          <span className="text-cream/60">{(settings.autoDelay / 1000).toFixed(1)}초</span>
        </div>
        <input
          type="range"
          min={400}
          max={3000}
          step={100}
          value={settings.autoDelay}
          onChange={(e) => setSetting('autoDelay', Number(e.target.value))}
          className="w-full accent-rose"
        />
      </label>
      <label className="block">
        <div className="mb-1 flex justify-between text-sm">
          <span>BGM 볼륨</span>
          <span className="text-cream/60">{Math.round(settings.bgmVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.bgmVolume}
          onChange={(e) => setSetting('bgmVolume', Number(e.target.value))}
          className="w-full accent-rose"
        />
      </label>
      <label className="block">
        <div className="mb-1 flex justify-between text-sm">
          <span>효과음 볼륨</span>
          <span className="text-cream/60">{Math.round(settings.sfxVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVolume}
          onChange={(e) => setSetting('sfxVolume', Number(e.target.value))}
          className="w-full accent-rose"
        />
      </label>
      <label className="flex items-center justify-between text-sm">
        <span>음소거</span>
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(e) => setSetting('muted', e.target.checked)}
          className="h-4 w-4 accent-rose"
        />
      </label>
      <label className="flex items-center justify-between text-sm">
        <span>안 읽은 텍스트도 스킵</span>
        <input
          type="checkbox"
          checked={settings.skipUnread}
          onChange={(e) => setSetting('skipUnread', e.target.checked)}
          className="h-4 w-4 accent-rose"
        />
      </label>
      <p className="text-xs text-cream/50">
        단축키: Space/Enter 진행 · A 자동 · Ctrl 스킵 · H UI 숨기기 · Esc 닫기
      </p>
    </div>
  )
}
