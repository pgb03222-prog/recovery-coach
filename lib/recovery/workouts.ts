// 어제 한 운동이 여러 개일 때, 점수와 강도 규칙에 쓰는 값을 하나로 합친다.
// - 힘든 정도: 어제 운동 중 가장 힘들었던 값 (가장 힘든 운동이 회복에 가장 큰 영향을 준다고 본다)
// - 운동 시간: 모든 운동의 합계

import type { YesterdayWorkout } from "./types";

/** 어제 운동 중 가장 높은 힘든 정도. 어제 운동을 안 했으면 undefined이다. */
export function maxEffort(workouts: readonly YesterdayWorkout[]): number | undefined {
  return workouts.length === 0 ? undefined : Math.max(...workouts.map((workout) => workout.effort));
}

/** 어제 운동 시간의 합계(분). 어제 운동을 안 했으면 0이다. */
export function totalMinutes(workouts: readonly YesterdayWorkout[]): number {
  return workouts.reduce((sum, workout) => sum + workout.minutes, 0);
}
