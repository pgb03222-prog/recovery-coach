// Design Ref: §4 데이터 흐름 2단계, PRD §5 감점표 — 100점에서 감점을 빼서 회복 점수를 계산한다.
// 이 파일은 "상한 적용 전" 점수까지만 계산한다. 60점 상한은 다음 작업(점수 상한 규칙)에서 더한다.
// 규칙 숫자는 모두 constants.ts에 있고, 여기서는 그 값을 읽어서 쓴다.

import {
  EFFORT_PENALTIES,
  LONG_WORKOUT_MINUTES,
  LONG_WORKOUT_PENALTY,
  MAX_SCORE,
  MIN_SCORE,
  SLEEP_PENALTIES,
  SORENESS_PENALTIES,
} from "./constants";
import type { RecoveryInput } from "./types";

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

  // 어제 운동을 안 했으면 힘든 정도와 운동 시간은 점수에 쓰지 않는다. (값이 와 있어도 무시)
  if (input.yesterdayType !== "none") {
    const { yesterdayEffort: effort, yesterdayMinutes: minutes } = input;
    if (effort === undefined) throw new RangeError("어제 힘든 정도가 없습니다.");
    if (minutes === undefined) throw new RangeError("어제 운동 시간이 없습니다.");

    const effortRule = EFFORT_PENALTIES.find((rule) => effort <= rule.maxEffort);
    if (!effortRule) throw new RangeError(`어제 힘든 정도가 범위를 벗어났습니다: ${effort}`);
    add("effort", effortRule.penalty);

    if (minutes >= LONG_WORKOUT_MINUTES) add("longWorkout", LONG_WORKOUT_PENALTY);
  }

  return penalties;
}

/**
 * 회복 점수(0~100)를 계산한다. 100점에서 감점을 모두 빼고, 0점 아래로는 내려가지 않는다.
 * 같은 입력이면 항상 같은 점수가 나온다.
 *
 * 주의: 60점 상한(근육통 4점 이상, 수면 5시간 미만)은 아직 적용하지 않은 점수이다.
 */
export function calculateScore(input: RecoveryInput): number {
  const totalPenalty = getPenalties(input).reduce((sum, penalty) => sum + penalty.amount, 0);
  return Math.max(MIN_SCORE, MAX_SCORE - totalPenalty);
}
