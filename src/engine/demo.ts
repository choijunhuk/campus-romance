import type { Scene } from '../types'

/**
 * Fallback content used ONLY when src/data/scenes/*.json is empty.
 * The moment real scene files are dropped into src/data/scenes/, the loader
 * uses those instead and ignores everything here (see engine/load.ts).
 *
 * This demo deliberately exercises every engine feature:
 * sprites + expressions, typewriter, choices (affection / set_flags / goto),
 * the BRANCH_TO_ROUTE and EVAL_ENDING:char_xx sentinels, and ending CG unlock.
 */
export const demoScenes: Scene[] = [
  {
    scene_id: 'c_01',
    title: '복학 첫날 (데모)',
    background: 'club_room',
    nodes: [
      {
        type: 'narration',
        text: '복학 첫날. 오래 비워둔 동아리방 문을 다시 연다. 납땜 냄새와 식은 자판기 커피 냄새가 그대로다.',
      },
      {
        type: 'dialogue',
        speaker: 'char_01',
        text: '오랜만이네. 안 변했다, 너.',
        expression: 'smile',
        sprite_position: 'center',
      },
      {
        type: 'dialogue',
        speaker: 'protagonist',
        text: '...지안 선배. 저 돌아왔어요.',
      },
      {
        type: 'choice',
        choices: [
          {
            label: '곧장 소매를 걷고 일을 돕는다',
            affection: { char_01: 50 },
            set_flags: ['jian_opened_up'],
            goto: null,
          },
          {
            label: '일단 가볍게 인사만 한다',
            affection: { char_01: 10 },
            goto: null,
          },
          {
            label: '못 본 척 구석 자리에 앉는다',
            affection: { char_01: -30 },
            set_flags: ['jian_pushed_away'],
            goto: null,
          },
        ],
      },
    ],
    next_scene: 'BRANCH_TO_ROUTE',
  },
  {
    scene_id: 'r1_01',
    title: '혼자 떠안은 밤 (데모)',
    background: 'rooftop',
    nodes: [
      {
        type: 'narration',
        text: '대회 마감이 코앞. 옥상으로 올라가니 지안 선배가 혼자 부품 더미와 씨름하고 있다.',
      },
      {
        type: 'dialogue',
        speaker: 'char_01',
        text: '...됐고. 너까지 밤샐 필요 없어.',
        expression: 'sad',
        sprite_position: 'center',
      },
      {
        type: 'choice',
        choices: [
          {
            label: '그래도 같이 할게요',
            affection: { char_01: 30 },
            set_flags: ['jian_opened_up'],
            goto: null,
          },
          {
            label: '알겠어요, 먼저 갈게요',
            affection: { char_01: -10 },
            goto: null,
          },
        ],
      },
    ],
    next_scene: 'EVAL_ENDING:char_01',
  },
  {
    scene_id: 'end_char_01_good',
    title: '처음 내민 손 (굿 엔딩)',
    background: 'rooftop',
    nodes: [
      {
        type: 'dialogue',
        speaker: 'char_01',
        text: '...같이 하자. 이번엔, 나 혼자 안 할래.',
        expression: 'blush',
        sprite_position: 'center',
      },
      { type: 'narration', text: '강한 사람도 기댈 곳이 필요하다. 두 사람의 새 학기가 시작된다.' },
    ],
    next_scene: null,
  },
  {
    scene_id: 'end_char_01_normal',
    title: '좋은 동료 (노멀 엔딩)',
    background: 'club_room',
    nodes: [
      {
        type: 'dialogue',
        speaker: 'char_01',
        text: '수고했어. ...다음 학기에도 동아리 나올 거지?',
        expression: 'neutral',
        sprite_position: 'center',
      },
      { type: 'narration', text: '좋은 동료로 남는다. 말하지 못한 마음은 다음 학기로 미뤄진다.' },
    ],
    next_scene: null,
  },
  {
    scene_id: 'end_char_01_bad',
    title: '닫힌 문 (배드 엔딩)',
    background: 'club_room',
    nodes: [
      {
        type: 'dialogue',
        speaker: 'char_01',
        text: '...신경 꺼. 처음부터 너랑 할 일 아니었어.',
        expression: 'angry',
        sprite_position: 'center',
      },
      { type: 'narration', text: '끝까지 혼자 떠안은 지안은 다시 멀어진다.' },
    ],
    next_scene: null,
  },
  {
    scene_id: 'solo_end',
    title: '혼자 서는 봄',
    background: 'han_river',
    nodes: [
      { type: 'narration', text: '누구의 곁도 아닌 자기 자신을 택했다.' },
      { type: 'narration', text: '프로젝트는 끝났고, 한 학기만큼 자란 채 여름을 맞는다. 쓸쓸하지만 나쁘지 않은 엔딩.' },
    ],
    next_scene: null,
  },
]
