// Design Ref: §4.1~4.2, PRD §5 — 감점표 숫자, 점수 상한, 강도 구간을 한 곳에 모아 둔다.
// 규칙 숫자를 바꿀 때는 이 파일만 고치면 되고, 계산 함수는 이 값을 읽어서 쓴다.

import type { Intensity, StrengthPart, WorkoutType } from "./types";

// ---------------------------------------------------------------------------
// 입력 범위 (PRD §4, DESIGN §4.6)
// ---------------------------------------------------------------------------

/** 숫자 입력 칸의 허용 범위. 운동 시간과 힘든 정도는 어제 운동 종류마다 따로 받는다. */
export const INPUT_LIMITS = {
  /** 수면 시간: 0~14시간, 0.5시간 단위 */
  sleepHours: { min: 0, max: 14, step: 0.5 },
  /** 어제 운동 시간(분): 5~240, 정수 */
  yesterdayMinutes: { min: 5, max: 240, step: 1 },
  /** 어제 힘든 정도: 1~10, 정수 */
  yesterdayEffort: { min: 1, max: 10, step: 1 },
  /** 근육통 정도: 1~5, 정수 */
  soreness: { min: 1, max: 5, step: 1 },
} as const;

/** 어제 운동 종류 (화면에 보여 주는 순서) */
export const WORKOUT_TYPES: readonly WorkoutType[] = ["cardio", "strength", "sports", "yoga", "other"];

/** 화면에 보여 줄 어제 운동 종류 이름 */
export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  cardio: "유산소",
  strength: "근력",
  sports: "구기·스포츠",
  yoga: "요가·스트레칭",
  other: "기타",
};

/** 근력 운동 부위 (화면에 보여 주는 순서와 오늘 추천할 때의 우선순위) */
export const STRENGTH_PARTS: readonly StrengthPart[] = ["upper", "lower", "core"];

/** 화면과 추천 문장에 쓰는 근력 부위 이름 */
export const STRENGTH_PART_LABELS: Record<StrengthPart, string> = {
  upper: "상체",
  lower: "하체",
  core: "코어",
};

// ---------------------------------------------------------------------------
// 점수 계산 (PRD §5 감점표)
// ---------------------------------------------------------------------------

/** 점수의 최댓값과 최솟값. 감점을 모두 빼고 0점 아래로는 내려가지 않는다. */
export const MAX_SCORE = 100;
export const MIN_SCORE = 0;

/**
 * 수면 시간 감점. 위에서부터 보고 처음 맞는 줄을 쓴다.
 * 7시간 이상 0 / 6시간 이상 -10 / 5시간 이상 -20 / 5시간 미만 -30
 */
export const SLEEP_PENALTIES = [
  { minHours: 7, penalty: 0 },
  { minHours: 6, penalty: 10 },
  { minHours: 5, penalty: 20 },
  { minHours: 0, penalty: 30 },
] as const;

/** 근육통 감점 (1~5점). 1점 0 / 2점 -10 / 3점 -20 / 4점 -30 / 5점 -40 */
export const SORENESS_PENALTIES: Readonly<Record<number, number>> = {
  1: 0,
  2: 10,
  3: 20,
  4: 30,
  5: 40,
};

/**
 * 어제 힘든 정도 감점. 위에서부터 보고 처음 맞는 줄을 쓴다.
 * 1~3 0 / 4~6 -10 / 7~8 -20 / 9~10 -30
 * "어제 운동 안 함"이면 감점은 0이다.
 */
export const EFFORT_PENALTIES = [
  { maxEffort: 3, penalty: 0 },
  { maxEffort: 6, penalty: 10 },
  { maxEffort: 8, penalty: 20 },
  { maxEffort: 10, penalty: 30 },
] as const;

/** 어제 운동 시간이 이 값(분) 이상이면 추가로 감점한다. */
export const LONG_WORKOUT_MINUTES = 90;
export const LONG_WORKOUT_PENALTY = 10;

// ---------------------------------------------------------------------------
// 점수 상한 (PRD §5 AI가 지킬 규칙)
// ---------------------------------------------------------------------------

/** 근육통이 이 값 이상이거나 수면이 아래 값 미만이면 점수는 SCORE_CAP을 넘기지 않는다. */
export const SCORE_CAP = 60;
export const CAP_SORENESS_AT_LEAST = 4;
export const CAP_SLEEP_BELOW_HOURS = 5;

// ---------------------------------------------------------------------------
// 강도 정하기 (DESIGN §4.1~4.3)
// ---------------------------------------------------------------------------

/** 강도 단계 순서. 앞쪽이 낮은 강도이다. */
export const INTENSITY_ORDER: readonly Intensity[] = ["rest", "light", "moderate", "high"];

/** 화면에 보여 줄 강도 이름 */
export const INTENSITY_LABELS: Record<Intensity, string> = {
  rest: "휴식",
  light: "가벼움",
  moderate: "보통",
  high: "높음",
};

/**
 * 점수에 따른 강도. 위에서부터 보고 처음 맞는 줄을 쓴다.
 * 0~39 휴식 / 40~60 가벼움 / 61~79 보통 / 80~100 높음
 * (40점 미만만 PRD에 있고 나머지 구간은 설계에서 정한 초안이다.)
 */
export const SCORE_TO_INTENSITY = [
  { minScore: 80, intensity: "high" },
  { minScore: 61, intensity: "moderate" },
  { minScore: 40, intensity: "light" },
  { minScore: 0, intensity: "rest" },
] as const satisfies readonly { minScore: number; intensity: Intensity }[];

/**
 * 어제 힘든 정도에 따른 어제 강도. 위에서부터 보고 처음 맞는 줄을 쓴다.
 * 1~3 가벼움 / 4~6 보통 / 7~10 높음
 * (PRD에 없어서 설계에서 정한 초안이다.)
 */
export const EFFORT_TO_INTENSITY = [
  { maxEffort: 3, intensity: "light" },
  { maxEffort: 6, intensity: "moderate" },
  { maxEffort: 10, intensity: "high" },
] as const satisfies readonly { maxEffort: number; intensity: Intensity }[];

/** 오늘 강도는 어제 강도보다 이 단계 수를 넘게 올리지 않는다. */
export const MAX_INTENSITY_STEP_UP = 1;

/** 어제 운동을 쉬었다면 오늘은 이 강도까지만 추천한다. */
export const REST_DAY_MAX_INTENSITY: Intensity = "moderate";

// ---------------------------------------------------------------------------
// 운동 추천 (PRD §5 AI가 지킬 규칙)
// ---------------------------------------------------------------------------

/** 어제 힘든 정도가 이 값 이상이면, 오늘 강도가 "높음"일 때 어제와 같은 종류는 뺀다. */
export const HARD_YESTERDAY_EFFORT_AT_LEAST = 8;

/** 추천 운동은 최대 3개이다. (최소 1개) */
export const MAX_RECOMMENDATIONS = 3;
