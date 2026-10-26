# v0.2 아트 방향과 제작 기록

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
