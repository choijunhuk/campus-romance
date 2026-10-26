import type { Scene, SpritePosition } from '../types'

export function visibleNode(scene: Scene, start: number, flags: string[]): number {
  let index = start
  while (index < scene.nodes.length) {
    const node = scene.nodes[index]
    if (node.type === 'choice') break
    if ((node.requires_flags ?? []).every((f) => flags.includes(f)) &&
        !(node.unless_flags ?? []).some((f) => flags.includes(f))) break
    index++
  }
  return index
}

/** Replay only visited nodes, including explicit exits and mid-scene CG changes. */
export function presentation(scene: Scene, path: number[]) {
  let background = scene.background
  let mood = scene.bgm_mood
  let cg: string | null = scene.cg ?? null
  const sprites: Partial<Record<SpritePosition, { charId: string; expression: string }>> = {}
  for (const index of path) {
    const n = scene.nodes[index]
    if (!n || n.type === 'choice') continue
    if (n.background) background = n.background
    if (n.type === 'narration' && n.bgm_mood) mood = n.bgm_mood
    if (n.cg !== undefined) cg = n.cg
    if (n.clear_sprites) for (const pos of Object.keys(sprites) as SpritePosition[]) delete sprites[pos]
    if (n.type === 'dialogue' && n.speaker !== 'protagonist' && n.sprite_position) {
      for (const pos of Object.keys(sprites) as SpritePosition[]) {
        if (sprites[pos]?.charId === n.speaker) delete sprites[pos]
      }
      sprites[n.sprite_position] = { charId: n.speaker, expression: n.expression ?? 'neutral' }
    }
  }
  return { background, mood, cg, sprites }
}
