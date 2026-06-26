import { z } from 'zod'

/**
 * Single source of truth for runtime shapes. These zod schemas mirror
 * src/data/SCHEMA.md and are used to validate every data file on load.
 * Big descriptive objects use .passthrough() so authoring detail the engine
 * does not consume never breaks the load — only engine-critical fields are
 * strictly enforced.
 */

export const SPRITE_POSITIONS = ['left', 'center', 'right'] as const

/* ── Scene nodes ─────────────────────────────────────────────────────────── */

export const ChoiceSchema = z.object({
  label: z.string(),
  affection: z.record(z.number()).optional(),
  set_flags: z.array(z.string()).optional(),
  // int = node index (same scene), string = scene_id, null/omitted = next node
  goto: z.union([z.number(), z.string(), z.null()]).optional(),
})

export const NodeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('narration'),
    text: z.string(),
    background: z.string().optional(),
    bgm_mood: z.string().optional(),
  }),
  z.object({
    type: z.literal('dialogue'),
    speaker: z.string(),
    text: z.string(),
    expression: z.string().optional(),
    sprite_position: z.enum(SPRITE_POSITIONS).optional(),
  }),
  z.object({
    type: z.literal('choice'),
    choices: z.array(ChoiceSchema),
  }),
])

export const SceneSchema = z.object({
  scene_id: z.string(),
  title: z.string(),
  background: z.string().optional(),
  bgm_mood: z.string().optional(),
  nodes: z.array(NodeSchema),
  // next scene_id | null | sentinel (BRANCH_TO_ROUTE | EVAL_ENDING:char_xx)
  next_scene: z.union([z.string(), z.null()]).optional(),
})

/* ── Characters ──────────────────────────────────────────────────────────── */

export const CharacterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    expression_set: z.array(z.string()),
  })
  .passthrough()

export const CharactersSchema = z.array(CharacterSchema)

/* ── World bible ─────────────────────────────────────────────────────────── */

export const WorldBibleSchema = z
  .object({
    title: z.array(z.string()),
    setting: z
      .object({
        key_locations: z.array(
          z.object({ id: z.string(), name: z.string(), desc: z.string() }),
        ),
      })
      .passthrough(),
  })
  .passthrough()

/* ── Routes / endings ────────────────────────────────────────────────────── */

const EndingSchema = z.object({ condition: z.string(), summary: z.string() })

export const RoutesSchema = z
  .object({
    affection_system: z
      .object({
        thresholds: z.object({
          route_unlock: z.number(),
          good_ending: z.number(),
          bad_ending_below: z.number(),
        }),
      })
      .passthrough(),
    character_routes: z.array(
      z
        .object({
          char_id: z.string(),
          endings: z.object({
            good: EndingSchema,
            normal: EndingSchema,
            bad: EndingSchema,
          }),
        })
        .passthrough(),
    ),
    solo_route: z
      .object({ scene_id: z.string(), title: z.string(), summary: z.string() })
      .passthrough(),
    flags: z.array(z.string()),
  })
  .passthrough()

/* ── Inferred types ──────────────────────────────────────────────────────── */

export type Choice = z.infer<typeof ChoiceSchema>
export type Node = z.infer<typeof NodeSchema>
export type Scene = z.infer<typeof SceneSchema>
export type Character = z.infer<typeof CharacterSchema>
export type WorldBible = z.infer<typeof WorldBibleSchema>
export type Routes = z.infer<typeof RoutesSchema>
export type SpritePosition = (typeof SPRITE_POSITIONS)[number]
export type EndingTier = 'good' | 'normal' | 'bad'
