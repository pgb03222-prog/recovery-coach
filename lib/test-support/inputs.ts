// 시험에서 입력을 짧게 만드는 도우미. 어제 운동 하나(또는 쉰 날)와 수면·근육통으로 입력을 만든다.

import type { RecoveryInput, StrengthPart, WorkoutType, YesterdayWorkout } from "../recovery/types";

/** 시험에서 근력 운동의 쓴 부위를 따로 정하지 않으면 상체만 쓴 것으로 본다. */
const DEFAULT_PARTS: StrengthPart[] = ["upper"];

/** 어제 운동 한 개짜리 입력. "none"이거나 시간·힘든 정도가 없으면 쉰 날로 본다. */
export function input(
  type: WorkoutType | "none",
  minutes: number | undefined,
  effort: number | undefined,
  sleepHours: number,
  soreness: number,
  strengthParts: StrengthPart[] = DEFAULT_PARTS,
): RecoveryInput {
  if (type === "none" || minutes === undefined || effort === undefined) {
    return { yesterdayWorkouts: [], sleepHours, soreness };
  }
  return {
    yesterdayWorkouts: [{ type, minutes, effort, ...(type === "strength" ? { strengthParts } : {}) }],
    sleepHours,
    soreness,
  };
}

/** 운동을 쉰 날 입력 */
export const rested = (sleepHours: number, soreness: number): RecoveryInput => input("none", undefined, undefined, sleepHours, soreness);

/** 어제 운동 여러 개짜리 입력 */
export function multi(workouts: YesterdayWorkout[], sleepHours: number, soreness: number): RecoveryInput {
  return { yesterdayWorkouts: workouts, sleepHours, soreness };
}
