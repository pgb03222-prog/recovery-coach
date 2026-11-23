// 회복 점수 계산(score.ts)이 PRD 감점표와 DESIGN §10.1 시험 표대로 나오는지 확인한다.
// 60점 상한은 다음 작업에서 더하므로, 여기서는 "상한 적용 전" 점수를 확인한다.

import { describe, expect, it } from "vitest";
import { calculateScore, getPenalties } from "./score";
import type { RecoveryInput, YesterdayType } from "./types";

/** 입력을 짧게 만드는 도우미 */
function input(
  type: YesterdayType,
  minutes: number | undefined,
  effort: number | undefined,
  sleepHours: number,
  soreness: number,
): RecoveryInput {
  return { yesterdayType: type, yesterdayMinutes: minutes, yesterdayEffort: effort, sleepHours, soreness };
}

/** 운동을 쉰 날 입력 */
const rested = (sleepHours: number, soreness: number): RecoveryInput =>
  ({ yesterdayType: "none", sleepHours, soreness });

describe("calculateScore - DESIGN 시험 표", () => {
  it.each([
    ["#1 쉰 날, 수면 8, 근육통 1", rested(8, 1), 100],
    ["#2 유산소 60분 힘든 5, 수면 4.5, 근육통 2", input("cardio", 60, 5, 4.5, 2), 50],
    ["#3 요가 30분 힘든 3, 수면 7, 근육통 4 (상한 전)", input("yoga", 30, 3, 7, 4), 70],
    ["#4 근력 100분 힘든 9, 수면 5.5, 근육통 3", input("strength", 100, 9, 5.5, 3), 20],
    ["#5 쉰 날, 수면 7, 근육통 5", rested(7, 5), 60],
    ["#6 근력 60분 힘든 8, 수면 7, 근육통 1", input("strength", 60, 8, 7, 1), 80],
    ["#7 요가 60분 힘든 2, 수면 8, 근육통 1", input("yoga", 60, 2, 8, 1), 100],
    ["#9 근력 120분 힘든 10, 수면 4, 근육통 5 (감점 합계 110)", input("strength", 120, 10, 4, 5), 0],
    ["#10 쉰 날, 수면 4, 근육통 4", rested(4, 4), 40],
    ["#11 근력 60분 힘든 4, 수면 4, 근육통 4", input("strength", 60, 4, 4, 4), 30],
    ["#12 근력 60분 힘든 7, 수면 7, 근육통 2", input("strength", 60, 7, 7, 2), 70],
    ["#13 유산소 45분 힘든 5, 수면 8, 근육통 1", input("cardio", 45, 5, 8, 1), 90],
  ])("%s → %i점", (_name, value, expected) => {
    expect(calculateScore(value)).toBe(expected);
  });

  it("#8 같은 입력이면 항상 같은 점수가 나온다", () => {
    const value = input("cardio", 60, 5, 6.5, 3);
    expect(calculateScore(value)).toBe(calculateScore({ ...value }));
  });
});

describe("calculateScore - 경계값", () => {
  it.each([
    [7, 100],
    [6.5, 90],
    [6, 90],
    [5.5, 80],
    [5, 80],
    [4.5, 70],
    [0, 70],
  ])("수면 %s시간만 달라지면 %i점 (상한 전)", (sleep, expected) => {
    expect(calculateScore(rested(sleep, 1))).toBe(expected);
  });

  it.each([
    [1, 100],
    [2, 90],
    [3, 80],
    [4, 70],
    [5, 60],
  ])("근육통 %i점만 달라지면 %i점", (soreness, expected) => {
    expect(calculateScore(rested(8, soreness))).toBe(expected);
  });

  it.each([
    [1, 100],
    [3, 100],
    [4, 90],
    [6, 90],
    [7, 80],
    [8, 80],
    [9, 70],
    [10, 70],
  ])("어제 힘든 정도 %i만 달라지면 %i점", (effort, expected) => {
    expect(calculateScore(input("cardio", 60, effort, 8, 1))).toBe(expected);
  });

  it.each([
    [89, 100],
    [90, 90],
    [240, 90],
  ])("어제 운동 %i분만 달라지면 %i점 (90분부터 -10)", (minutes, expected) => {
    expect(calculateScore(input("cardio", minutes, 3, 8, 1))).toBe(expected);
  });

  it("0점 아래로는 내려가지 않는다", () => {
    expect(calculateScore(input("strength", 240, 10, 0, 5))).toBe(0);
  });
});

describe("calculateScore - 쉰 날", () => {
  it("힘든 정도와 운동 시간 값이 와 있어도 점수에 쓰지 않는다", () => {
    const withExtra = { yesterdayType: "none", yesterdayMinutes: 240, yesterdayEffort: 10, sleepHours: 8, soreness: 1 } as const;
    expect(calculateScore(withExtra)).toBe(100);
  });
});

describe("getPenalties", () => {
  it("감점이 없으면 빈 목록이다", () => {
    expect(getPenalties(rested(8, 1))).toEqual([]);
  });

  it("감점된 항목만 수면 → 근육통 → 힘든 정도 → 긴 운동 순서로 돌려준다", () => {
    expect(getPenalties(input("strength", 100, 9, 5.5, 3))).toEqual([
      { factor: "sleep", amount: 20 },
      { factor: "soreness", amount: 20 },
      { factor: "effort", amount: 30 },
      { factor: "longWorkout", amount: 10 },
    ]);
  });

  it("감점이 0인 항목은 목록에 넣지 않는다", () => {
    expect(getPenalties(input("cardio", 60, 2, 8, 2))).toEqual([{ factor: "soreness", amount: 10 }]);
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("운동을 했는데 힘든 정도나 시간이 없으면 오류를 던진다", () => {
    expect(() => calculateScore(input("cardio", 60, undefined, 8, 1))).toThrow(RangeError);
    expect(() => calculateScore(input("cardio", undefined, 5, 8, 1))).toThrow(RangeError);
  });

  it("범위 밖 값이면 오류를 던진다", () => {
    expect(() => calculateScore(rested(-1, 1))).toThrow(RangeError);
    expect(() => calculateScore(rested(8, 7))).toThrow(RangeError);
    expect(() => calculateScore(rested(8, 2.5))).toThrow(RangeError);
    expect(() => calculateScore(input("cardio", 60, 11, 8, 1))).toThrow(RangeError);
  });
});
