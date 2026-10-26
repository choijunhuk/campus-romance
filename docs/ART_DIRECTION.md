# 아트 방향과 제작 기록

## v0.3 · 미연시풍 캐릭터 디자인

사용자 선택에 따라 선명한 2D 미연시풍으로 바꾸었습니다. 제작은 내장 ImageGen이며 새 결과물도 AI 생성 이미지입니다. 실제 손그림으로 제작했다는 의미는 아닙니다. 원본 PNG와 배포용 WebP를 구분해 보관합니다.

| 인물 | 외형과 의상 | 시각적 구분 |
| --- | --- | --- |
| 서지안 | 검은 로우 포니테일, 실버 안경, 네이비 재킷·아이보리 톱 | 차분한 눈매와 자신감, 파랑 |
| 유나래 | 구릿빛 웨이브 반묶음, 별 핀, 코럴 카디건·데님 | 밝은 눈과 장난기, 코럴 |
| 윤서하 | 잉크 바이올렛 단발, 달 이어커프, 플럼 바시티 재킷·헤드폰 | 고양이 눈매와 여유, 보라 |
| 차이서 | 갈색 하이 포니테일·틸 리본, 크림 트랙 재킷·스포츠 시계 | 건강한 인상과 활기, 틸 |

각 원본은 2열×3행의 투명 6표정 아틀라스입니다. 순서는 neutral, smile, laugh, blush, sad, angry. `embarrassed`·`surprised`는 blush 프레임을 씁니다. 지안 원본을 스타일 참조로 다른 인물을 생성하고, 각 원본을 자기 컷신의 인물 참조로 사용했습니다. 프롬프트에 성인 나이, 머리·눈·의상·액세서리, 선화·셀 채색, 표정별 눈썹과 시선을 지정했습니다.

`prepare-art.mjs`는 각 셀을 추출하고 투명 여백을 넣어 1024×2049 WebP로 패킹합니다. 각 셀의 8px 투명 경계가 이웃 표정의 픽셀이 비치는 것을 막습니다. 캐릭터는 2×3, 기존 친구 공유 아틀라스는 2×2로 표시합니다.

컷신은 네 인물마다 2장, 총 8장입니다. 커피·옥상, 우산·강변, 방송실·방송 종료, 경기 뒤·밤 관중석을 본편에 연결했습니다. 원본의 두 패널을 1280×720으로 추출합니다. 모바일은 중앙 구도를 사용하고 대사창과 이미지 영역을 분리합니다. 방송실·운동장 낮/밤 4장을 더해 배경은 17장입니다.

원본은 `art/source/*-v3.png`, 본편은 `public/assets/art-v2/*-v3.webp`입니다. 디렉터리 이름은 기존 경로를 이어 쓴 것으로 실제 목록은 `src/data/art.json`이 기준입니다. `art:check`는 참조 파일의 디코딩, 크기, 투명도와 아틀라스 기하를 검사합니다.

## v0.2 제작 기록

제작 방식은 내장 ImageGen의 참조 이미지 기반 생성·편집입니다. 처음 만든 광택이 강한 콘셉트 두 장은 최종 본편에 사용하지 않습니다. 새 결과물도 AI 생성 이미지이며, ‘손으로 그린 듯한 2D 스타일’은 표현 방향을 뜻합니다.

## 최종 프롬프트 구성

모든 에셋에 같은 미술 기준을 적용했습니다.

> Understated hand-inked indie 2D visual novel illustration. Clean slightly varied ink contours, matte flat muted colors, one or two clearly defined cel-shadow tones. Natural adult proportions and modest expressive eyes. Cream, olive, dusty blue, charcoal and taupe palette. No photorealistic rendering, glossy skin or lips, glassy eyes, detailed fabric textures, bloom, rim-light halos, bokeh, painterly rendering or oversharpening. No text, logos or watermark.

캐릭터 시트는 다음 구성을 덧붙였습니다.

> A genuinely transparent 2 by 2 equal-cell waist-up expression atlas. Entire image 3:4, each cell also 3:4. Same scale, pose, head position and clothing across cells. Complete heads and elbows inside every cell. No panel borders or labels. Nothing crosses cell boundaries.

| 결과물 | 캐릭터·장면 프롬프트의 핵심 |
| --- | --- |
| `jian.png` | 24세 지안, 검은 낮은 묶음머리·앞머리·얇은 은테 안경·회색 카디건·흰 티·청바지. 중립·작은 미소·부끄러움·걱정 4표정 |
| `narae.png` | 22세 나래, 갈색 반묶음 머리·노란 별핀·노란 맨투맨·데님 오버롤. 같은 4표정. 지안 시트로 채색·선의 기준 유지 |
| `friends.png` | 위 행: 21세 도윤, 갈색 머리·후디·헤드폰. 아래 행: 24세 시혁, 검은 머리·남색 셔츠·기타 피크 목걸이. 각 중립·미소 |
| `jian-coffee.png` | 새벽 작업실, 일이 끝난 뒤 지안이 두 번째 종이컵 커피를 건네는 순간. 인물 시트를 외형 기준으로 사용 |
| `jian-rooftop.png` | 축제 밤 옥상, 지안이 플레이어에게 손을 내미는 관계 전환 장면 |
| `narae-rain.png` | 카페 마감 뒤 귀갓길, 나래가 우산 손잡이를 함께 잡고 올려다보는 순간 |
| `narae-river.png` | 강변 벤치, 나래가 기다리는 주인공을 그린 스케치북을 보여주며 손을 잡는 순간 |
| `backgrounds-sheet.png` | 정확히 2열×3행. 작업실·도서관·학식당·후문 카페거리·옥상·강변. 인물 없는 각 16:9 패널 |
| `backgrounds-night-sheet.png` | 낮 시트를 참조. 6개 패널의 구조·구도를 유지하고 밤하늘·실내 조명·도시 불빛만 변경 |
| `campus.png` | 낡은 공학관과 봄 캠퍼스 산책로. 조용한 타이틀용 배경, 인물 없음 |
| `lecture.png` | 발표 시연용 테이블과 빈 프로젝터 화면이 있는 계단식 공대 강의실. 인물 없음 |

CG는 하나의 16:9 장면으로 만들었으며, 시트 구도를 복제하지 않도록 명시했습니다. 성인 인물의 얼굴·헤어·의상을 참조로 고정하고 새 장면을 그렸습니다.

## 파일과 패킹

- 원본 PNG: [`art/source/`](../art/source).
- 실제 본편 파일: [`public/assets/art-v2/`](../public/assets/art-v2).
- 사용 목록: [`src/data/art.json`](../src/data/art.json).
- 런타임 표정·배경 매핑: [`src/art.ts`](../src/art.ts).
- 패널 추출·WebP 인코딩: [`scripts/prepare-art.mjs`](../scripts/prepare-art.mjs).

원본을 보존하고 WebP 사본을 배포합니다. 패킹 과정은 생성 이미지를 다시 그리거나 인물을 수정하지 않으며, 6개 배경 패널 추출과 이미지 인코딩만 수행합니다. 스프라이트 알파 채널을 유지합니다.

```bash
npm run art:pack
npm run art:check
```

새 에셋은 파일 존재뿐 아니라 실제 디코딩·해상도·알파와 플레이 화면에서의 구도를 확인해야 합니다. 표정 이름 8개에 독립된 그림 8장이 있는 것은 아니며, 현재는 히로인 4표정·친구 2표정을 재사용합니다.
