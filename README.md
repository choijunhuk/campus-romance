# 과방 너머 봄 · Campus Romance

> 함께 일하던 사람을, 조금 다르게 보기 시작했다. 수요일 저녁 다음의 약속은 누구와 할까.

한울대학교 공학 동아리 **회로의 봄**을 배경으로 한 한국어 캠퍼스 로맨스 비주얼 노벨입니다. 24세 복학생 주인공이 한 학기의 프로젝트와 일상 속에서 연애·우정·자신의 생활을 선택합니다.

[플레이하기](https://choijunhuk.github.io/campus-romance/) · [개편 내용](docs/REDESIGN.md) · [아트 방향과 제작 기록](docs/ART_DIRECTION.md) · [스토리 작성 규약](src/data/SCHEMA.md)

![과방 너머 봄](docs/screenshots/title-desktop.png)

## Story Edition 02 · v0.2

| 이야기 | 구성 |
| --- | --- |
| 공통 루트 | 개강부터 축제 전까지 8씬 |
| 서지안 | 함께 일하던 선배와 같은 편이 되어가는 연애 · 본편 14씬 + 선택에 따라 방문하는 2씬 |
| 유나래 | 모두에게 친절한 사람과 둘만의 관계를 만드는 연애 · 본편 14씬 + 선택에 따라 방문하는 2씬 |
| 한도윤 | 서로의 기여를 인정하는 우정·개발 프로젝트 5씬 |
| 정시혁 | 진로와 밴드 활동을 함께 응원하는 우정 5씬 |
| 결말 | 각 경로 3개 + 솔로 1개, 총 13개 |

전체 **63씬·404노드**입니다. 루트는 최고 호감도 인물로 자동 결정되지 않고, 공통 루트 마지막에서 직접 고릅니다. 선택한 데이트 활동과 대화 방식은 이후 대사와 방문 장면에 남습니다.

모든 인물은 성인 대학생입니다. 서로에게 끌리는 과정, 관계 공개, 입맞춤, 약속과 마감의 충돌, 갈등 뒤의 대화까지 다룹니다. 관계를 천천히 진행하거나 입맞춤을 미루어도 좋은 결말에 도달할 수 있습니다. 연령 등급을 공식적으로 부여받은 작품은 아닙니다.

## 플레이 기능

- 투명 배경 캐릭터 스프라이트, 낮·밤 배경, 본편 중간 이벤트 CG 4장과 장면 모음.
- 자동 진행, 읽은 대사 스킵, 선택 기록을 포함한 대사 로그, 인물별 관계 소개.
- 자동 저장 1개·수동 슬롯 3개, 저장 덮어쓰기 확인, 장면의 선택 이력과 컷신 복원.
- 글자 크기 16–26px, 대사 속도·자동 대기·음량 조절, 모션 줄이기 환경 설정 반영.
- 관계 수치는 기본 숨김. 보고 싶다면 읽기 설정에서 켤 수 있습니다.
- 별도 음악 파일 없이 재생되는 Web Audio 배경음과 선택 효과음.
- 모바일 세로·가로 화면 대응, 키보드 조작, 메뉴 포커스 관리.

![본편 플레이 화면](docs/screenshots/game-mobile.png)

| 조작 | 동작 |
| --- | --- |
| 클릭 / Space / Enter | 대사 전체 보기 또는 다음 대사 |
| A | 자동 진행 |
| Ctrl | 스킵 전환 |
| H | 대사창 숨김·복귀 |
| Esc | 메뉴 닫기 / 숨긴 UI 복귀 / 메뉴 열기 |
| 숫자 1–5 | 현재 선택지 선택 |
| 백틱 키 | 개발용 진행 정보 |

자동 진행과 스킵은 선택지에서 멈춥니다. 기본 설정에서는 읽지 않은 대사를 건너뛰지 않습니다. 저장·읽은 대사·설정·장면 해금은 브라우저 localStorage에 보관되며 기기 간 자동 동기화되지 않습니다.

**v0.1 저장 안내:** 이야기와 노드 구성이 달라 이전 버전 저장은 불러오지 않습니다. 수동 슬롯 원본은 덮어쓰지 않는 한 남으며, 새로 시작하면 자동 저장 슬롯은 v0.2 진행으로 바뀝니다.

## 로컬 실행

**Node.js 24 이상**이 필요합니다. 게임 실행에 API 키는 필요하지 않습니다.

```bash
git clone https://github.com/choijunhuk/campus-romance.git
cd campus-romance
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

| 명령어 | 용도 |
| --- | --- |
| `npm run validate` | 씬·분기·플래그·CG·에셋 참조 검사 |
| `npm test` | 엔진·실제 스토리 경로·저장/복원 테스트 |
| `npm run build` | 콘텐츠 검증 → TypeScript 검사 → 배포용 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run test:e2e` | 실제 브라우저 플레이·갤러리·반응형 검사 |
| `npm run story:build` | 작성 원본에서 씬 JSON과 설정 재생성 |
| `npm run art:pack` | 원본 아틀라스에서 배경 추출·WebP 패킹 |
| `npm run art:check` | 이미지 디코딩·해상도·스프라이트 알파 검사 |

브라우저 테스트를 처음 실행할 때:

```bash
npx playwright install chromium
npm run test:e2e
```

설치된 Chrome을 사용하려면 `PLAYWRIGHT_CHANNEL=chrome` 환경 변수를 설정하세요. CI는 Node 24에서 엔진 테스트·빌드·Chromium 플레이 검사를 실행합니다.

## 개발 구조

```text
src/
├── components/       # 타이틀·플레이·저장·설정·갤러리
├── data/
│   ├── world_bible.json  # 학번·휴학·일정·작품 톤
│   ├── characters.json   # 인물과 연애/우정 역할
│   ├── routes.json       # 경로·결말·플래그
│   ├── art.json          # 실제 사용 에셋 목록
│   └── scenes/           # 씬별 JSON
├── engine/           # 분기·조건 대사·화면 상태·배경음·테스트
├── art.ts            # 표정 프레임·배경·컷신 매핑
└── store.ts          # 진행·저장·설정
scripts/
├── write-story.mjs   # 스토리 작성 원본
├── prepare-art.mjs   # 아틀라스 추출·WebP 패킹
├── check-art.mjs     # 이미지 검증
└── validate-content.js
art/source/          # 새 아트의 원본 PNG, 배포에는 포함하지 않음
public/assets/art-v2/# 본편에서 사용하는 WebP
e2e/                 # 실제 브라우저 테스트
```

React 18 · Vite 8 · TypeScript · Zustand · Zod 4 · CSS · Vitest · Playwright.

스토리를 고칠 때는 `scripts/write-story.mjs`를 수정하고 `npm run story:build`를 실행합니다. JSON만 직접 고치면 다음 재생성 때 덮어써집니다. 이후 검증·테스트·빌드를 실행하세요. 세부 엔진 규약은 [SCHEMA.md](src/data/SCHEMA.md)에 있습니다.

이전 이미지 생성기(`npm run gen-images:dry`, `scripts/gen-images.js`)와 v0.1 에셋은 보관되어 있지만, v0.2 본편은 `art.json`의 새 아트를 사용합니다. 기존 수영복 보너스 갤러리는 현재 UI에서 사용하지 않습니다.

## 배포

`master` push 시 [GitHub Pages 워크플로](.github/workflows/deploy.yml)가 `/campus-romance/` 기준으로 빌드·배포합니다. Pages가 GitHub Actions를 사용하도록 설정되어 있어야 합니다. 브랜치와 PR의 변경은 병합 전까지 플레이 링크에 반영되지 않습니다.
