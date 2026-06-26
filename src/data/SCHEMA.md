# 데이터 스키마 & 엔진 규약 (단일 진실 소스)

엔진은 이 규약대로 데이터를 해석한다. 새 씬/캐릭터 추가 시 이 규약만 지키면 코드 수정 불필요.

## 파일 구조
- `world_bible.json` — 객체. `setting.key_locations[].id`가 배경 id의 진실 소스.
- `characters.json` — 배열. 각 캐릭터 `id`, `appearance_lock`, `seed`, `expression_set`.
- `routes.json` — 객체. 호감도 시스템/공통·개별 루트/엔딩 조건/플래그.
- `scenes/*.json` — 씬 1개 = 파일 1개. 아래 노드 스키마.
- `image_prompts.json` — 이미지 생성용 프롬프트.

## 씬 스키마 (`scenes/*.json`)
```
{
  "scene_id": "c_01",
  "title": "...",
  "background": "key_locations 중 id",   // 예: "club_room"
  "bgm_mood": "warm_afternoon",
  "nodes": [ Node, ... ],
  "next_scene": "<다음 scene_id> | null | SENTINEL"
}
```

### Node 타입
- `narration`: `{ "type":"narration", "text":"...", "background"?, "bgm_mood"? }` — 노드 단위로 배경/BGM 전환 가능(옵션).
- `dialogue`: `{ "type":"dialogue", "speaker":"char_01|protagonist", "text":"...", "expression":"smile", "sprite_position":"left|center|right" }`
- `choice`: `{ "type":"choice", "choices":[ Choice, ... ] }`

### Choice
```
{ "label":"...", "affection": { "char_01": 10 }, "set_flags":["flag_x"], "goto": <node index 정수> | <scene_id> | null }
```
- `goto`가 정수면 같은 씬 내 노드 인덱스로 점프, 문자열이면 해당 씬으로 이동, null이면 다음 노드로 진행.
- `affection`/`set_flags`는 선택지 선택 즉시 적용. 값은 정수(±).

## next_scene 센티넬 (엔진 특수 처리)
- `"BRANCH_TO_ROUTE"` — 호감도 최고(≥ `route_unlock`=40) 캐릭터의 루트 첫 씬으로. 후보 없으면 `solo_end`로.
  매핑: char_01→`r1_01`, char_02→`r2_01`, char_03→`r3_01`, char_04→`r4_01`.
- `"EVAL_ENDING:char_01"` — `routes.json`의 해당 캐릭터 endings 조건을 평가해 엔딩 씬으로.
  굿/노멀/배드 → `end_char_01_good` / `end_char_01_normal` / `end_char_01_bad`.
  평가 우선순위: bad 조건(< bad_ending_below=20 또는 bad 플래그) → good 조건(≥ good_ending=75 AND good 플래그) → 그 외 normal.
- `null` (엔딩 씬에서) — 게임 종료, 결과 화면.

## 엔딩 씬 id 규칙
`end_<char_id>_<good|normal|bad>` + `solo_end`. 본 엔딩은 CG 갤러리 해금에 사용(`event_id` = `<char>_<tier>_ending` 와 매핑).

## 플래그
`routes.json.flags` 참고. set은 choice의 `set_flags`로만. 굿/배드 엔딩 조건이 플래그를 참조하므로 반드시 어딘가 씬에서 set 되어야 함(체크리스트 항목).
