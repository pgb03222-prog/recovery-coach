// Design Ref: §4 데이터 흐름 2단계, PRD §5 감점표 — 100점에서 감점을 빼서 회복 점수를 계산한다.
// 감점만 반영한 점수(calculateRawScore)에 60점 상한을 더한 최종 점수(calculateScore)를 계산한다.
// 다른 곳에서는 최종 점수를 돌려주는 calculateScore를 쓴다.
// 규칙 숫자는 모두 constants.ts에 있고, 여기서는 그 값을 읽어서 쓴다.

import {
  CAP_SLEEP_BELOW_HOURS,
  CAP_SORENESS_AT_LEAST,
  EFFORT_PENALTIES,
  LONG_WORKOUT_MINUTES,
  LONG_WORKOUT_PENALTY,
  MAX_SCORE,
  MIN_SCORE,
  SCORE_CAP,
  SLEEP_PENALTIES,
  SORENESS_PENALTIES,
} from "./constants";
import type { RecoveryInput } from "./types";
import { maxEffort, totalMinutes } from "./workouts";

/** 점수를 깎는 항목 이름 */
export type PenaltyFactor = "sleep" | "soreness" | "effort" | "longWorkout";

/** 감점 하나. amount는 깎인 점수(양수)이다. */
export interface Penalty {
  factor: PenaltyFactor;
  amount: number;
}

/**
 * 감점된 항목만 순서대로 돌려준다. (수면 → 근육통 → 힘든 정도 → 긴 운동 시간)
 * 감점이 없는 항목은 목록에 넣지 않는다. 점수 근거 문장을 만들 때도 이 목록을 쓴다.
 *
 * 입력은 validateRecoveryInput을 통과한 값이어야 한다.
 * 범위 밖이거나 빠진 값이 오면 조용히 넘어가지 않고 RangeError를 던진다.
 */
export function getPenalties(input: RecoveryInput): Penalty[] {
  const penalties: Penalty[] = [];

  function add(factor: PenaltyFactor, amount: number) {
    if (amount > 0) penalties.push({ factor, amount });
  }

  // 수면: 표를 위에서부터 보고 처음 맞는 줄을 쓴다.
  const sleepRule = SLEEP_PENALTIES.find((rule) => input.sleepHours >= rule.minHours);
  if (!sleepRule) throw new RangeError(`수면 시간이 범위를 벗어났습니다: ${input.sleepHours}`);
  add("sleep", sleepRule.penalty);

  // 근육통: 1~5점마다 정해진 값이 있다.
  const sorenessPenalty = SORENESS_PENALTIES[input.soreness] as number | undefined;
  if (sorenessPenalty === undefined) throw new RangeError(`근육통 정도가 범위를 벗어났습니다: ${input.soreness}`);
  add("soreness", sorenessPenalty);

  // 어제 운동을 안 했으면(운동 목록이 비어 있으면) 힘든 정도와 운동 시간은 점수에 쓰지 않는다.
  // 여러 개를 했으면 힘든 정도는 가장 힘들었던 운동의 값, 운동 시간은 모든 운동의 합계를 쓴다.
  const effort = maxEffort(input.yesterdayWorkouts);
  if (effort !== undefined) {
    const effortRule = EFFORT_PENALTIES.find((rule) => effort <= rule.maxEffort);
    if (!effortRule) throw new RangeError(`어제 힘든 정도가 범위를 벗어났습니다: ${effort}`);
    add("effort", effortRule.penalty);

    if (totalMinutes(input.yesterdayWorkouts) >= LONG_WORKOUT_MINUTES) add("longWorkout", LONG_WORKOUT_PENALTY);
  }

  return penalties;
}

/**
 * 감점만 반영한 점수(0~100)를 계산한다. 100점에서 감점을 모두 빼고, 0점 아래로는 내려가지 않는다.
 * 같은 입력이면 항상 같은 점수가 나온다.
 *
 * 주의: 60점 상한은 적용하기 전 점수이다. 사용자에게 보여 줄 최종 점수는 calculateScore를 쓴다.
 */
export function calculateRawScore(input: RecoveryInput): number {
  const totalPenalty = getPenalties(input).reduce((sum, penalty) => sum + penalty.amount, 0);
  return Math.max(MIN_SCORE, MAX_SCORE - totalPenalty);
}

/** 점수 상한을 거는 원인 */
export type CapCause = "soreness" | "sleep";

/**
 * 60점 상한 조건에 해당하는 원인을 돌려준다. (근육통 → 수면 순서)
 * - 근육통이 4점 이상이면 "soreness"
 * - 수면이 5시간 미만이면 "sleep"
 * 점수가 이미 60점 이하여도 조건에 해당하면 원인은 목록에 들어간다.
 */
export function getCapCauses(input: RecoveryInput): CapCause[] {
  const causes: CapCause[] = [];
  if (input.soreness >= CAP_SORENESS_AT_LEAST) causes.push("soreness");
  if (input.sleepHours < CAP_SLEEP_BELOW_HOURS) causes.push("sleep");
  return causes;
}

/** 최종 점수 계산 결과 */
export interface ScoreResult {
  /** 감점만 반영한 점수 (상한 적용 전) */
  rawScore: number;
  /** 최종 점수. 상한이 걸리면 60점을 넘지 않는다. */
  score: number;
  /** 상한 때문에 점수가 실제로 낮아졌는지. "60점까지만 나와요" 근거는 이 값이 true일 때만 보여 준다. */
  capped: boolean;
  /** 상한 조건에 해당하는 원인 (capped가 true일 때 근거 문장에 쓴다) */
  capCauses: CapCause[];
}

/**
 * 최종 회복 점수를 계산한다. 감점을 반영한 점수에, 근육통 4점 이상이거나 수면 5시간 미만이면
 * 60점을 넘지 않는다는 상한을 건다. 같은 입력이면 항상 같은 결과가 나온다.
 */
export function calculateScore(input: RecoveryInput): ScoreResult {
  const rawScore = calculateRawScore(input);
  const capCauses = getCapCauses(input);
  const score = capCauses.length > 0 ? Math.min(rawScore, SCORE_CAP) : rawScore;
  return { rawScore, score, capped: score < rawScore, capCauses };
}
