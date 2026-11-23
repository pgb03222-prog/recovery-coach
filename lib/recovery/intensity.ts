// Design Ref: §4.1~4.2 점수 → 강도 규칙, 어제 강도와 한 단계 제한 — 오늘의 운동 강도를 정한다.
// 강도는 규칙으로만 정한다. AI는 정해진 강도를 설명하는 문장만 쓴다.
// Plan SC: 점수가 40점 미만이면 휴식, 어제보다 한 단계 넘게 올리지 않는다, 같은 입력이면 항상 같은 결과.

import {
  INPUT_LIMITS,
  EFFORT_TO_INTENSITY,
  INTENSITY_ORDER,
  MAX_INTENSITY_STEP_UP,
  MAX_SCORE,
  MIN_SCORE,
  REST_DAY_MAX_INTENSITY,
  SCORE_TO_INTENSITY,
} from "./constants";
import { calculateScore } from "./score";
import type { Intensity, RecoveryInput } from "./types";

/** 강도 단계의 순서 번호. 휴식 0, 가벼움 1, 보통 2, 높음 3 */
function stepOf(intensity: Intensity): number {
  return INTENSITY_ORDER.indexOf(intensity);
}

/**
 * 점수만으로 정한 강도. 0~39 휴식 / 40~60 가벼움 / 61~79 보통 / 80~100 높음
 * 점수가 0~100 밖이면 RangeError를 던진다.
 */
export function intensityFromScore(score: number): Intensity {
  if (!(score >= MIN_SCORE && score <= MAX_SCORE)) {
    throw new RangeError(`점수가 범위를 벗어났습니다: ${score}`);
  }
  const rule = SCORE_TO_INTENSITY.find((candidate) => score >= candidate.minScore);
  if (!rule) throw new RangeError(`점수에 맞는 강도 구간이 없습니다: ${score}`);
  return rule.intensity;
}

/**
 * 어제 힘든 정도로 본 어제 강도. 1~3 가벼움 / 4~6 보통 / 7~10 높음
 * 힘든 정도가 1~10 밖이면 RangeError를 던진다.
 */
export function intensityFromEffort(effort: number): Intensity {
  const { min, max } = INPUT_LIMITS.yesterdayEffort;
  if (!(effort >= min && effort <= max)) {
    throw new RangeError(`어제 힘든 정도가 범위를 벗어났습니다: ${effort}`);
  }
  const rule = EFFORT_TO_INTENSITY.find((candidate) => effort <= candidate.maxEffort);
  if (!rule) throw new RangeError(`힘든 정도에 맞는 강도 구간이 없습니다: ${effort}`);
  return rule.intensity;
}

/**
 * 어제 기준으로 오늘 허용되는 가장 높은 강도.
 * - 어제 운동을 했으면: 어제 강도보다 한 단계 위까지 (높음보다 위는 없다)
 * - 어제 운동을 안 했으면: 보통까지. (어제 가볍게 한 사람보다 쉰 사람이 더 높은 강도를 받는 순서 뒤집힘을 막는다)
 */
export function getMaxIntensity(input: RecoveryInput): Intensity {
  if (input.yesterdayType === "none") return REST_DAY_MAX_INTENSITY;

  if (input.yesterdayEffort === undefined) throw new RangeError("어제 힘든 정도가 없습니다.");
  const yesterday = intensityFromEffort(input.yesterdayEffort);
  const maxStep = Math.min(stepOf(yesterday) + MAX_INTENSITY_STEP_UP, INTENSITY_ORDER.length - 1);
  return INTENSITY_ORDER[maxStep];
}

/** 오늘의 강도를 정한 결과 */
export interface IntensityResult {
  /** 오늘의 최종 강도 */
  intensity: Intensity;
  /** 점수만으로 정한 강도 (제한을 걸기 전) */
  scoreIntensity: Intensity;
  /** 어제 기준으로 허용되는 가장 높은 강도 */
  maxIntensity: Intensity;
  /** 어제 기준 제한 때문에 강도가 실제로 낮아졌는지 */
  limited: boolean;
}

/**
 * 오늘의 강도를 정한다.
 * 오늘 강도 = 점수로 정한 강도와 어제 기준 허용 강도 중 낮은 쪽.
 * 점수는 60점 상한까지 적용한 최종 점수를 쓴다.
 *
 * 입력은 validateRecoveryInput을 통과한 값이어야 한다. 아니면 RangeError를 던진다.
 */
export function determineIntensity(input: RecoveryInput): IntensityResult {
  const { score } = calculateScore(input);
  const scoreIntensity = intensityFromScore(score);
  const maxIntensity = getMaxIntensity(input);
  const limited = stepOf(scoreIntensity) > stepOf(maxIntensity);
  const intensity = limited ? maxIntensity : scoreIntensity;

  return { intensity, scoreIntensity, maxIntensity, limited };
}
