import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame, STORY_VERSION } from '../store'
import { scenes } from './load'
import { presentation, visibleNode } from './presentation'
import type { Scene } from '../types'

beforeEach(() => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  })
  useGame.getState().start('테스트')
})

function play(route: number, preference = 0, ending = 0) {
  const lines: string[] = []
  const visited = new Set<string>()
  for (let steps = 0; steps < 700; steps++) {
    const s = useGame.getState(), scene = scenes.get(s.sceneId)!
    visited.add(s.sceneId)
    if (s.ended) return { scene: s.sceneId, lines, visited }
    const n = scene.nodes[s.nodeIndex]
    if (n.type === 'choice') {
      const final = ['r1_14', 'r3_14', 'r2_05', 'r4_05'].includes(s.sceneId)
      s.choose(n.choices[s.sceneId === 'c_08' ? route : final ? ending : preference])
    } else { lines.push(n.text); s.advance() }
  }
  throw new Error('Playthrough failed to terminate')
}

describe('real authored playthroughs', () => {
  for (const [route, char] of [[0, 'char_01'], [1, 'char_03'], [2, 'char_02'], [3, 'char_04']] as const) {
    for (const [ending, tier] of [[0, 'good'], [1, 'normal'], [2, 'bad']] as const) {
      it(`${char}: reaches the ${tier} ending through actual choices`, () => {
        const result = play(route, 0, ending)
        expect(result.scene).toBe(`end_${char}_${tier}`)
      })
    }
  }
  it('slow romance choices reach a good ending without requiring a kiss', () => {
    const result = play(0, 1, 0)
    expect(result.scene).toBe('end_char_01_good')
    expect(result.lines.some(l => l.includes('오늘은 손만'))).toBe(false) // choices are separate from narration
    expect(result.lines.some(l => l.includes('지안이 손을 더 깊게'))).toBe(true)
    expect(result.lines.some(l => l.includes('안경을 벗어 접는'))).toBe(false)
  })
  it('Narae remembers the selected date activity in her epilogue conversation', () => {
    const result = play(1, 0)
    expect(result.lines.some(l => l.includes('그날 강변에서 듣던 기타 곡'))).toBe(true)
    expect(result.lines.some(l => l.includes('둘이 멋대로 지은 이야기'))).toBe(false)
  })
  it('solo is an explicit choice, independent of relationship points', () => {
    expect(play(4).scene).toBe('solo_end')
  })
  it('a choice cannot be applied a second time after its node is left', () => {
    const s = useGame.getState()
    s.goToScene('c_08')
    for (let i=0;i<20;i++) {
      const current=useGame.getState()
      if(scenes.get(current.sceneId)?.nodes[current.nodeIndex]?.type==='choice') break
      current.advance()
    }
    const scene = scenes.get('c_08')!, n = scene.nodes[useGame.getState().nodeIndex]
    if (n.type !== 'choice') throw new Error('No choice')
    s.choose(n.choices[0])
    const after = useGame.getState().affection.char_01
    s.choose(n.choices[0])
    expect(useGame.getState().affection.char_01).toBe(after)
  })
})

describe('presentation and persistence', () => {
  it('unselected conditional nodes never enter the visited path', () => {
    const scene: Scene = { scene_id: 'conditional', title: '', nodes: [
      { type: 'narration', text: 'A', requires_flags: ['a'] },
      { type: 'narration', text: 'B', unless_flags: ['a'] },
      { type: 'narration', text: 'merge' },
    ] }
    expect(visibleNode(scene, 0, [])).toBe(1)
    expect(visibleNode(scene, 0, ['a'])).toBe(0)
    expect(visibleNode(scene, 1, ['a'])).toBe(2)
  })
  it('moving a character clears their prior position and explicit exits clear the stage', () => {
    const scene: Scene = {scene_id: 'stage', title: '', nodes: [
      {type: 'dialogue', speaker: 'char_01', text: '', sprite_position: 'left'},
      {type: 'dialogue', speaker: 'char_01', text: '', sprite_position: 'center'},
      {type: 'narration', text: '', clear_sprites: true, cg: 'jian_coffee'},
      {type: 'narration', text: '', cg: null},
    ]}
    expect(presentation(scene, [0, 1]).sprites.left).toBeUndefined()
    expect(presentation(scene, [0, 1, 2]).sprites).toEqual({})
    expect(presentation(scene, [0, 1, 2, 3]).cg).toBeNull()
  })
  it('saves and restores the exact mid-scene CG and only unlocks it once visited', () => {
    useGame.getState().goToScene('r1_03')
    expect(useGame.getState().galleryIds()).not.toContain('jian_coffee')
    for (let i = 0; i < 4; i++) useGame.getState().advance()
    expect(useGame.getState().galleryIds()).toContain('jian_coffee')
    useGame.getState().save('s1')
    useGame.getState().goToScene('c_01')
    expect(useGame.getState().load('s1')).toBe(true)
    const s = useGame.getState()
    expect(presentation(scenes.get(s.sceneId)!, s.path).cg).toBe('jian_coffee')
  })
  it('does not load previous story-version saves into changed node indexes', () => {
    useGame.getState().save('s1')
    const data = JSON.parse(localStorage.getItem('vn_save_s1')!)
    expect(data.storyVersion).toBe(STORY_VERSION)
    delete data.storyVersion
    localStorage.setItem('vn_save_s1', JSON.stringify(data))
    expect(useGame.getState().load('s1')).toBe(false)
  })
})
