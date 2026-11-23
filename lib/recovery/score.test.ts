// 회복 점수 계산(score.ts)이 PRD 감점표와 DESIGN §10.1 시험 표대로 나오는지 확인한다.
// calculateRawScore는 60점 상한 적용 전 점수이고, calculateScore는 상한까지 적용한 최종 점수이다.

import { describe, expect, it } from "vitest";
import { calculateRawScore, calculateScore, getCapCauses, getPenalties } from "./score";
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

describe("calculateRawScore - DESIGN 시험 표", () => {
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
    expect(calculateRawScore(value)).toBe(expected);
  });

  it("#8 같은 입력이면 항상 같은 점수가 나온다", () => {
    const value = input("cardio", 60, 5, 6.5, 3);
    expect(calculateRawScore(value)).toBe(calculateRawScore({ ...value }));
  });
});

describe("calculateRawScore - 경계값", () => {
  it.each([
    [7, 100],
    [6.5, 90],
    [6, 90],
    [5.5, 80],
    [5, 80],
    [4.5, 70],
    [0, 70],
  ])("수면 %s시간만 달라지면 %i점 (상한 전)", (sleep, expected) => {
    expect(calculateRawScore(rested(sleep, 1))).toBe(expected);
  });

  it.each([
    [1, 100],
    [2, 90],
    [3, 80],
    [4, 70],
    [5, 60],
  ])("근육통 %i점만 달라지면 %i점", (soreness, expected) => {
    expect(calculateRawScore(rested(8, soreness))).toBe(expected);
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
    expect(calculateRawScore(input("cardio", 60, effort, 8, 1))).toBe(expected);
  });

  it.each([
    [89, 100],
    [90, 90],
    [240, 90],
  ])("어제 운동 %i분만 달라지면 %i점 (90분부터 -10)", (minutes, expected) => {
    expect(calculateRawScore(input("cardio", minutes, 3, 8, 1))).toBe(expected);
  });

  it("0점 아래로는 내려가지 않는다", () => {
    expect(calculateRawScore(input("strength", 240, 10, 0, 5))).toBe(0);
  });
});

describe("calculateRawScore - 쉰 날", () => {
  it("힘든 정도와 운동 시간 값이 와 있어도 점수에 쓰지 않는다", () => {
    const withExtra = { yesterdayType: "none", yesterdayMinutes: 240, yesterdayEffort: 10, sleepHours: 8, soreness: 1 } as const;
    expect(calculateRawScore(withExtra)).toBe(100);
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

describe("calculateScore - 60점 상한", () => {
  it("#3 근육통 4점이면 70점이 60점으로 깎인다", () => {
    expect(calculateScore(input("yoga", 30, 3, 7, 4))).toEqual({
      rawScore: 70,
      score: 60,
      capped: true,
      capCauses: ["soreness"],
    });
  });

  it("#14 수면 5시간 미만이면 70점이 60점으로 깎이고, 5시간부터는 깎이지 않는다", () => {
    const results = [7, 6, 5, 4.5].map((sleep) => calculateScore(rested(sleep, 1)));
    expect(results.map((result) => result.score)).toEqual([100, 90, 80, 60]);
    expect(results.map((result) => result.capped)).toEqual([false, false, false, true]);
    expect(results[3].capCauses).toEqual(["sleep"]);
  });

  it("근육통 3점은 상한이 걸리지 않는다", () => {
    expect(calculateScore(rested(8, 3))).toEqual({ rawScore: 80, score: 80, capped: false, capCauses: [] });
  });

  it("조건에 해당해도 점수가 이미 60점이면 깎이지 않은 것으로 본다 (근거 문장을 쓰지 않는다)", () => {
    // 근육통 5점: 감점 40점 → 60점
    expect(calculateScore(rested(7, 5))).toEqual({
      rawScore: 60,
      score: 60,
      capped: false,
      capCauses: ["soreness"],
    });
  });

  it("조건에 해당해도 점수가 60점보다 낮으면 그대로 둔다", () => {
    // 근육통 4점 + 수면 4시간: 감점 60점 → 40점
    expect(calculateScore(rested(4, 4))).toEqual({
      rawScore: 40,
      score: 40,
      capped: false,
      capCauses: ["soreness", "sleep"],
    });
  });

  it("상한 조건이 없으면 감점만 반영한 점수와 같다", () => {
    const value = input("cardio", 60, 5, 6.5, 2);
    const result = calculateScore(value);
    expect(result.score).toBe(calculateRawScore(value));
    expect(result.capped).toBe(false);
    expect(result.capCauses).toEqual([]);
  });

  it("입력 조합 전체에서: 상한 조건이면 60점을 넘지 않고, 아니면 감점만 반영한 점수와 같다", () => {
    for (let soreness = 1; soreness <= 5; soreness += 1) {
      for (let sleep = 0; sleep <= 14; sleep += 0.5) {
        for (const value of [rested(sleep, soreness), input("strength", 100, 9, sleep, soreness), input("yoga", 30, 2, sleep, soreness)]) {
          const result = calculateScore(value);
          const conditionMet = soreness >= 4 || sleep < 5;
          if (conditionMet) {
            expect(result.score).toBeLessThanOrEqual(60);
          } else {
            expect(result.score).toBe(result.rawScore);
          }
          expect(result.score).toBeLessThanOrEqual(result.rawScore);
        }
      }
    }
  });

  it("같은 입력이면 항상 같은 결과가 나온다", () => {
    const value = input("sports", 80, 6, 4.5, 3);
    expect(calculateScore(value)).toEqual(calculateScore({ ...value }));
  });

  it("검사를 통과하지 못한 입력은 오류를 던진다", () => {
    expect(() => calculateScore(rested(8, 7))).toThrow(RangeError);
  });
});

describe("getCapCauses", () => {
  it.each([
    [rested(8, 3), []],
    [rested(8, 4), ["soreness"]],
    [rested(8, 5), ["soreness"]],
    [rested(5, 1), []],
    [rested(4.5, 1), ["sleep"]],
    [rested(0, 1), ["sleep"]],
    [rested(4, 4), ["soreness", "sleep"]],
  ])("근육통·수면 조합 %#", (value, expected) => {
    expect(getCapCauses(value)).toEqual(expected);
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("운동을 했는데 힘든 정도나 시간이 없으면 오류를 던진다", () => {
    expect(() => calculateRawScore(input("cardio", 60, undefined, 8, 1))).toThrow(RangeError);
    expect(() => calculateRawScore(input("cardio", undefined, 5, 8, 1))).toThrow(RangeError);
  });

  it("범위 밖 값이면 오류를 던진다", () => {
    expect(() => calculateRawScore(rested(-1, 1))).toThrow(RangeError);
    expect(() => calculateRawScore(rested(8, 7))).toThrow(RangeError);
    expect(() => calculateRawScore(rested(8, 2.5))).toThrow(RangeError);
    expect(() => calculateRawScore(input("cardio", 60, 11, 8, 1))).toThrow(RangeError);
  });
});
