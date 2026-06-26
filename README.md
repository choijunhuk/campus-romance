# 회로의 봄 — Campus Romance (Web Visual Novel Engine)

A data-driven visual novel engine. React + Vite + TypeScript, state via
[zustand], styling via [Tailwind], all data files validated at load time with
[zod]. Builds to a static bundle (Vercel-ready).

The engine is fully data-driven: **add a scene = add a JSON file**, no code
change. Story/character data lives under `src/data/` and is the single source of
truth — see [`src/data/SCHEMA.md`](src/data/SCHEMA.md).

## Run / build / deploy

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check (tsc -b) + production build -> dist/
npm run preview    # preview the production build
```

Deploy `dist/` anywhere static. On **Vercel**: framework preset **Vite**, build
command `npm run build`, output dir `dist`.

> Image generation tooling (`npm run gen-images`) is pre-existing and reads
> `src/data/image_prompts.json`; it is independent of the engine.

## How to add a scene

1. Drop a file `src/data/scenes/<scene_id>.json` matching the scene schema in
   `SCHEMA.md`. `import.meta.glob` picks it up automatically — no code change.
2. Reference it from another scene via `next_scene` or a choice `goto`.

Minimal example:

```json
{
  "scene_id": "c_05",
  "title": "새 장면",
  "background": "gwabang",
  "nodes": [
    { "type": "narration", "text": "..." },
    { "type": "dialogue", "speaker": "char_01", "text": "...", "expression": "smile", "sprite_position": "center" },
    { "type": "choice", "choices": [
      { "label": "선택 A", "affection": { "char_01": 10 }, "set_flags": ["some_flag"], "goto": null }
    ] }
  ],
  "next_scene": "c_06"
}
```

`goto`: integer = node index in the same scene, string = scene_id, `null`/omitted
= next node. `next_scene` supports the sentinels `BRANCH_TO_ROUTE` and
`EVAL_ENDING:char_xx` (implemented per `SCHEMA.md`), or a scene_id, or `null`
(ending).

> **Demo fallback:** if `src/data/scenes/` is empty, the engine runs a small
> bundled demo (`src/engine/demo.ts`) so it is playable out of the box. The
> moment any real scene JSON exists, the demo is ignored.

## How to swap / add images

Drop PNGs into `public/assets/` using these path conventions (missing files
render a labeled placeholder box — never a crash):

| Kind       | Path                                                 |
| ---------- | ---------------------------------------------------- |
| Character  | `public/assets/characters/{char_id}_{expression}.png`|
| Background | `public/assets/backgrounds/{location_id}_day.png`    |
| Event CG   | `public/assets/cg/{event_id}.png`                    |

- Expressions come from each character's `expression_set` in `characters.json`.
- Background ids come from `world_bible.json` → `setting.key_locations[].id`.
- CG `event_id` for endings is `<char>_<tier>_ending` (and `solo_ending`).

## Controls

- **Click / Space / Enter** — advance text (click again to skip the typewriter).
- **`` ` `` (backtick)** — toggle the debug overlay (affection + flags + position).
- In-game top bar: 저장 / 불러오기 / 디버그 / 타이틀.

## Features

1. Title screen with player-name input.
2. Scene player: sequential nodes, click/Space, typewriter (skippable).
3. Character sprites by `expression` + `sprite_position` (left/center/right).
4. Backgrounds by scene/node `background` id.
5. Choices apply affection deltas + `set_flags`, then `goto`.
6. Affection per character, clamped 0–100, with debug toggle.
7. Route branching + endings via `BRANCH_TO_ROUTE` / `EVAL_ENDING` sentinels.
8. Save/Load: localStorage, 3 manual slots + autosave.
9. CG gallery: ending CGs unlock on reaching ending scenes (persists across runs).
10. Responsive: mobile portrait + desktop landscape.

## Project structure

```
src/
  data/               # AUTHORED CONTENT — engine never modifies it (SCHEMA.md is truth)
  types.ts            # TS types + zod schemas (single runtime-shape source)
  store.ts            # zustand store: state, navigation, save/load, affection, CG
  engine/
    load.ts           # validates data files; import.meta.glob for scenes
    branching.ts      # BRANCH_TO_ROUTE / EVAL_ENDING sentinel resolution
    demo.ts           # fallback scenes used only when scenes/ is empty
  components/
    App routing, TitleScreen, Game, Gallery, SaveLoadMenu, ui (SmartImage, typewriter)
```

[zustand]: https://github.com/pmndrs/zustand
[Tailwind]: https://tailwindcss.com
[zod]: https://zod.dev
