# 데이터 스키마와 엔진 규약 · Story Edition 02

실제 타입 검증은 `src/types.ts`, 정적 참조 검사는 `scripts/validate-content.js`, 조건 대사와 화면 상태 복원은 `src/engine/presentation.ts`를 기준으로 합니다.

## 작성 원본과 JSON

스토리 작성 원본은 `scripts/write-story.mjs`입니다. 수정한 뒤 `npm run story:build`로 씬 JSON·세계관·캐릭터·루트를 재생성합니다. JSON에만 한 수정은 다음 생성 때 덮어써집니다.

```json
{
  "scene_id": "r1_03",
  "title": "당연하게 기다리는 사람",
  "date": "5월 14일",
  "chapter": "서지안 · 같은 편",
  "background": "club_room",
  "bgm_mood": "quiet_night",
  "nodes": [],
  "next_scene": "r1_04"
}
```

`background`는 `world_bible.json`의 장소 ID입니다. `date`와 `chapter`는 화면에 표시할 문자열입니다. `cg`를 씬에 지정하면 첫 노드부터 해당 이벤트 그림을 표시합니다.

## 노드

- `narration`: `type`, `text`. 선택적으로 `background`, `bgm_mood`, `goto`.
- `dialogue`: `type`, `speaker`, `text`. 선택적으로 `expression`, `sprite_position`, `background`, `goto`.
- `choice`: `type`, `choices`.

내레이션과 대사 노드에서 다음 필드를 함께 사용할 수 있습니다.

| 필드 | 동작 |
| --- | --- |
| `requires_flags: string[]` | 모두 설정된 경우에만 이 노드를 방문 |
| `unless_flags: string[]` | 하나라도 설정되어 있으면 이 노드를 건너뜀 |
| `cg: string` | `art.json.events[].id`의 컷신 표시·해금 |
| `cg: null` | 컷신을 닫고 장소 배경으로 복귀 |
| `clear_sprites: true` | 지금까지 표시한 인물을 모두 퇴장 |

조건을 만족하지 않는 노드는 대사·화면 변경·`goto` 효과 없이 다음 인덱스로 건너뜁니다. 선택지 자체에는 조건을 붙이지 않습니다. 조건 대사를 거친 선택지는 항상 실제로 도달 가능해야 합니다.

대사 `speaker`는 캐릭터 ID 또는 `protagonist`. 표정은 해당 인물의 `expression_set`, 위치는 `left`, `center`, `right`입니다. 인물이 새 위치로 이동하면 기존 위치는 지웁니다. 현재 작성 도우미는 화자 중심 화면을 위해 인물을 한 명씩 표시합니다.

## 선택과 이동

```json
{
  "type": "choice",
  "choices": [
    {
      "label": "오늘은 천천히 알아가고 싶어요.",
      "affection": { "char_01": 5 },
      "set_flags": ["jian_slow"],
      "clear_flags": [],
      "goto": null
    }
  ]
}
```

플래그는 `routes.json.flags`에 선언합니다. `clear_flags`로 지정한 플래그를 먼저 지우고 `set_flags`를 적용합니다. 호감도는 0–100으로 제한됩니다. 선택을 적용한 노드를 떠난 뒤 같은 선택을 다시 적용할 수 없습니다.

`goto`는 정수면 같은 씬의 노드 인덱스, 문자열이면 다른 씬 ID, 생략·`null`이면 다음 노드입니다. 내레이션·대사·선택지에서 지원합니다. 다른 씬으로 나가는 선택 뒤에 도달할 수 없는 노드를 두지 마세요.

현재 공통 마지막 `c_08`은 각 경로의 첫 씬으로 직접 이동합니다. `BRANCH_TO_ROUTE`는 이전 데이터 호환과 엔진 규약을 위해 남아 있지만 v0.3 본편 루트 결정에는 쓰지 않습니다.

`next_scene`은 다음 씬 ID, `null`(종료), 또는 센티넬입니다.

- `BRANCH_TO_ROUTE`: 호감도 40 이상 중 최고 인물. 없으면 솔로, 동률은 캐릭터 순서.
- `EVAL_ENDING:char_xx`: 호감도 20 미만 또는 배드 플래그 → bad. 호감도 75 이상과 굿 플래그 → good. 그 외 normal.

결말 ID는 `end_<char_id>_<good|normal|bad>` 또는 `solo_end`. 엔딩 도달 기록과 이벤트 CG 해금은 별도로 보관합니다. 엔딩은 원하지 않은 연애를 강제하지 않으며 마지막 선택으로 관계를 계속할지 결정합니다.

## 에셋과 저장

`art.json`은 실제 사용하는 새 에셋 목록입니다. 이벤트 ID와 파일, 인물·배경 매핑을 확인하세요. 이미지 파일을 넣는 것만으로 갤러리에 자동 등록되지는 않습니다.

화면은 현재 씬의 **실제로 방문한 노드 목록 `path`**를 재생해 복원합니다. 조건 때문에 건너뛴 노드나 다른 분기의 표정·CG가 섞이지 않도록 인덱스까지의 단순 전체 스캔을 하지 않습니다.

저장 버전은 `storyVersion: 3`. v0.1·v0.2 저장은 변경된 노드에 연결하지 않고 불러오기를 거절합니다. 현재 버전의 노드 인덱스와 방문 이력도 검사합니다. 기존 수동 슬롯 원본과 장면 해금 기록은 보관합니다.

v0.3 캐릭터는 `char_05` 윤서하, `char_06` 차이서가 추가되었습니다. 연애 경로는 r1/r3/r5/r6, 우정은 r2/r4입니다. 히로인은 2열×3행의 6표정, 친구 공유 시트는 2열×2행입니다. `art.json`의 파일을 수정한 뒤 `art:pack`·`art:check`로 확인하세요.

`soundtrack.json`은 id/title/bpm/style/file/duration을 선언합니다. `scoreForScene`이 갈등·고백·데이트를 우선 선곡하고 나머지 장면에 인물 테마와 시간대 음악을 고릅니다. `bgm_mood`는 배경의 시간대에도 쓰이므로 곡명으로 바꾸지 않습니다.

작성 후 `npm run validate`, `npm test`, `npm run build`를 실행하고, 실제 플레이는 `npm run test:e2e`와 직접 읽기로 확인합니다.
