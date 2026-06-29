# 회로의 봄 — Campus Romance

복학 첫 학기, 공학관 동아리 **회로의 봄**에서 다시 마주친 네 사람과의 한 학기.

한울대학교 공과대학을 배경으로 한 한국어 캠퍼스 로맨스 비주얼 노벨입니다. 공통 루트(4개 씬)에서 쌓은 호감도가 4개 개별 루트와 **13개 엔딩** 중 하나로 분기됩니다. 선택지마다 호감도(0–100)와 플래그가 변하고, 루트 진입(≥40) · 굿엔딩(≥75) · 배드엔딩(<20) 세 임계값이 결말을 결정합니다.

Built with **React 18 + Vite + TypeScript + Zustand + Zod + Tailwind CSS**.

---

## Quick Start

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev        # 개발 서버 → http://localhost:5173
npm run validate   # 씬 데이터 단독 검증 (빌드 전에도 실행 가능)
npm run build      # validate → tsc -b → vite build
npm run preview    # 빌드 결과 미리보기
npm test           # Vitest 엔진 테스트 (branching + scene-graph)
```

> `npm run build` is wired to run `validate` first — a content error blocks the build with a non-zero exit code.

---

## Project Structure

```
campus-romance/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component / screen router
│   ├── store.ts              # Zustand store (game state, saves, settings)
│   ├── types.ts              # Zod schemas: NodeSchema, ChoiceSchema, SceneSchema, …
│   ├── components/           # React UI (TitleScreen, Game, Gallery, SaveLoadMenu, …)
│   ├── engine/
│   │   ├── load.ts           # import.meta.glob scene loading + Zod validation
│   │   ├── branching.ts      # BRANCH_TO_ROUTE, EVAL_ENDING, affection thresholds
│   │   └── demo.ts           # Bundled fallback scenes (no real scene files needed)
│   └── data/
│       ├── SCHEMA.md         # Authoring schema — single source of truth
│       ├── world_bible.json  # Setting, locations, protagonist, themes
│       ├── characters.json   # Character definitions + expression sets
│       ├── routes.json       # Affection system, route/ending conditions, flags
│       ├── image_prompts.json# Art generation prompts (chars / BGs / CGs / UI)
│       └── scenes/           # One JSON file per scene  ← add scenes here
├── scripts/
│   ├── validate-content.js   # Content validator (errors block build; warnings do not)
│   ├── gen-images.js         # Batch image generator
│   └── providers/            # Image backends: openai.js  gemini.js  replicate.js  local.js
└── public/
    └── assets/
        ├── characters/       # {char_id}_{expression}.png
        ├── backgrounds/      # {location_id}_{time}.png
        ├── cg/               # {event_id}.png  (CG gallery)
        └── ui/               # title_screen, dialogue_box, …
```

---

## How the Engine Works

### Scene loading

Scenes are **data-driven JSON files** loaded at bundle time via Vite's `import.meta.glob`:

```ts
// src/engine/load.ts
const sceneModules = import.meta.glob('../data/scenes/*.json', { eager: true })
```

Every file is validated against `SceneSchema` (Zod) on load. Validation errors accumulate into `loadErrors[]` and are surfaced in the UI — they never throw. If `src/data/scenes/` is empty the engine runs the bundled demo (`src/engine/demo.ts`). The entry scene is `c_01` when present, otherwise the first scene found.

### Node types

Each scene has an ordered `nodes` array. Three types are supported:

| Type | Required fields | Optional fields |
|---|---|---|
| `narration` | `text` | `background`, `bgm_mood`, `goto` |
| `dialogue` | `speaker`, `text` | `expression`, `sprite_position`, `background`, `bgm_mood`, `goto` |
| `choice` | `choices[]` | — |

`speaker` must be a character `id` from `characters.json` or the string `"protagonist"`. `expression` must appear in that character's `expression_set`.

### The `goto` contract

`goto` is honoured on **all three node types** — including `narration` and `dialogue`:

| Value | Effect |
|---|---|
| integer | Jump to that node index within the same scene |
| string | Transition to that `scene_id` |
| `null` or omitted | Advance to the next node sequentially |

On a `choice`, each `Choice` object carries its own `goto` with the same semantics, applied immediately after affection/flag side-effects.

### `next_scene` and sentinels

When the last node in a scene is exhausted the engine reads `next_scene`:

| Value | Effect |
|---|---|
| `"<scene_id>"` | Transition to that scene |
| `"BRANCH_TO_ROUTE"` | Route-branch on highest affection ≥ 40. char_01→`r1_01`, char_02→`r2_01`, char_03→`r3_01`, char_04→`r4_01`. No qualifying character → `solo_end`. |
| `"EVAL_ENDING:char_xx"` | Evaluate endings for that character (see below) |
| `null` | Game ends — results screen |

### Affection thresholds and endings

Affection per character is clamped 0–100. Three thresholds from `routes.json` drive all branching:

| Threshold | Default | Role |
|---|---|---|
| `route_unlock` | 40 | Minimum to enter a character route via `BRANCH_TO_ROUTE` |
| `good_ending` | 75 | Floor for the good ending |
| `bad_ending_below` | 20 | Ceiling for the bad ending |

`EVAL_ENDING:char_xx` evaluates in this priority order:
1. **bad** — affection < 20, OR the character's bad flag is set
2. **good** — affection ≥ 75, AND the character's good flag is set
3. **normal** — everything else

Ending scene IDs follow the pattern `end_<char_id>_<good|normal|bad>` (e.g. `end_char_01_good`). The solo route uses `solo_end`. Reaching an ending scene automatically unlocks the corresponding CG gallery slot (`<char_id>_<tier>_ending`).

### Visited-path sprite mechanism

The Zustand store tracks `path: number[]` — the ordered list of node indices actually visited in the current scene. Background and sprite state is derived by replaying this path, not just reading `nodeIndex`. This is necessary because branch jumps and merges can make a cursor index alone ambiguous about which per-node `background` overrides are in effect.

---

## Authoring Content

### Adding a scene

Drop a `.json` file in `src/data/scenes/`. The filename is arbitrary — the engine keys scenes by `scene_id` inside the JSON. See [`src/data/SCHEMA.md`](src/data/SCHEMA.md) for the complete field reference.

Minimal scene skeleton:

```json
{
  "scene_id": "c_05",
  "title": "새 씬 제목",
  "background": "club_room",
  "bgm_mood": "warm_afternoon",
  "nodes": [
    { "type": "narration", "text": "동아리방 문을 열었다." },
    {
      "type": "dialogue",
      "speaker": "char_01",
      "expression": "smile",
      "sprite_position": "left",
      "text": "늦었네요."
    },
    {
      "type": "choice",
      "choices": [
        { "label": "미안, 좀 늦었어.", "affection": { "char_01": 5 }, "goto": null },
        { "label": "제 시간인데요.", "affection": { "char_01": -5 }, "goto": null }
      ]
    }
  ],
  "next_scene": "c_06"
}
```

**Always run `npm run validate` after editing scene files.** The validator catches:

- `goto` / `next_scene` targets that resolve to no known scene
- `goto` integers out of range for the node array
- Unknown `speaker` IDs or `expression` values absent from a character's `expression_set`
- Unknown `background` IDs (warning, not error)
- Unreachable (orphaned) nodes — dead content that no `goto` path can reach
- `EVAL_ENDING:` pointing at an unknown character ID
- Declared route/ending scenes with no corresponding JSON file
- Missing labels or empty `choices` arrays on choice nodes

Errors → exit 1 (build blocked). Warnings → exit 0 (printed, build continues).

### Valid IDs at a glance

| Field | Source of truth |
|---|---|
| `speaker` | `id` in `src/data/characters.json`, plus `"protagonist"` |
| `expression` | `expression_set[]` per character in `characters.json` |
| `background` | `setting.key_locations[].id` in `src/data/world_bible.json` |
| flags | `flags[]` array in `src/data/routes.json` |

---

## Generating Art

The pipeline reads `src/data/image_prompts.json` and writes to `public/assets/`. Existing files are skipped automatically.

```bash
# Preview every task — no API call made
npm run gen-images:dry
# (same as: node scripts/gen-images.js --dry-run)

# Generate with a specific provider
node scripts/gen-images.js --provider openai      # default
node scripts/gen-images.js --provider gemini
node scripts/gen-images.js --provider replicate
node scripts/gen-images.js --provider local       # AUTOMATIC1111

# Limit total generations (useful for smoke-testing)
node scripts/gen-images.js --provider openai --limit 5
```

### Providers

| Provider | Required env var |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `replicate` | `REPLICATE_API_TOKEN` |
| `local` | `SD_API_URL` |

Set keys in a `.env` file at the project root (loaded automatically via `dotenv`).

### Local Stable Diffusion (AUTOMATIC1111)

Start A1111 with the `--api` flag, then:

```bash
SD_API_URL=http://127.0.0.1:7860 node scripts/gen-images.js --provider local
```

Recommended model family: **Illustrious / SDXL**. The pipeline targets portrait aspect (832×1216) for character sprites and 16:9 for CGs and backgrounds. Expression variants use the character's base image as a reference for consistency; if the base does not exist yet the pipeline generates without a reference and logs a warning.

### Output layout

```
public/assets/
  characters/{char_id}_{expression}.png   # e.g. char_01_smile.png
  backgrounds/{location_id}_{time}.png    # e.g. club_room_night.png
  cg/{event_id}.png                       # e.g. char_01_good_ending.png
  ui/{key}.png                            # title_screen, dialogue_box, …
```

---

## Testing

```bash
npm test
```

Runs the **Vitest** suite covering:

- **Branching logic** — `branchToRoute`, `evalEnding`, `resolveNext` with affection edge cases, flag conditions, and threshold boundaries
- **Scene-graph reachability** — verifies every scene in `src/data/scenes/` is reachable from `START_SCENE` and that no `goto` / `next_scene` target is a dead end

---

## Characters

| ID | Name | Route start |
|---|---|---|
| `char_01` | 서지안 Seo Jian | `r1_01` |
| `char_02` | 한도윤 Han Doyun | `r2_01` |
| `char_03` | 유나래 Yu Narae | `r3_01` |
| `char_04` | 정시혁 Jung Sihyuk | `r4_01` |

Each character has 8 expressions: `neutral` `smile` `blush` `laugh` `sad` `angry` `surprised` `embarrassed`.

---

## Save System

One auto-save slot (`auto`) and three manual slots (`s1`–`s3`), persisted in `localStorage`. Auto-save fires on every node advance, choice, and scene transition. On load the engine validates the saved `scene_id` against the live scene map before restoring state — corrupt or stale saves are rejected gracefully rather than crashing.

| Slot | Label |
|---|---|
| `auto` | 자동 저장 |
| `s1` | 슬롯 1 |
| `s2` | 슬롯 2 |
| `s3` | 슬롯 3 |

---

## Controls

| Input | Action |
|---|---|
| Click / Space / Enter | Advance text (second press skips the typewriter) |
| Backtick `` ` `` | Toggle debug overlay (affection values, flags, node index) |
| In-game top bar | 저장 / 불러오기 / 갤러리 / 타이틀 |
