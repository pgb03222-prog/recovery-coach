// 운동 강도 정하기(intensity.ts)가 DESIGN §4.1~4.2와 §10.1 시험 표대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { INTENSITY_ORDER } from "./constants";
import { determineIntensity, getMaxIntensity, intensityFromEffort, intensityFromScore } from "./intensity";
import { calculateScore } from "./score";
import type { Intensity, RecoveryInput } from "./types";
import { input, multi, rested } from "../test-support/inputs";

const step = (intensity: Intensity) => INTENSITY_ORDER.indexOf(intensity);

describe("intensityFromScore - 점수 구간", () => {
  it.each([
    [0, "rest"],
    [30, "rest"],
    [39, "rest"],
    [40, "light"],
    [60, "light"],
    [61, "moderate"],
    [70, "moderate"],
    [79, "moderate"],
    [80, "high"],
    [100, "high"],
  ] as const)("%i점 → %s", (score, expected) => {
    expect(intensityFromScore(score)).toBe(expected);
  });

  it("점수가 0~100 밖이거나 숫자가 아니면 오류를 던진다", () => {
    for (const score of [-1, 101, Number.NaN]) {
      expect(() => intensityFromScore(score)).toThrow(RangeError);
    }
  });
});

describe("intensityFromEffort - 어제 힘든 정도", () => {
  it.each([
    [1, "light"],
    [3, "light"],
    [4, "moderate"],
    [6, "moderate"],
    [7, "high"],
    [10, "high"],
  ] as const)("힘든 정도 %i → %s", (effort, expected) => {
    expect(intensityFromEffort(effort)).toBe(expected);
  });

  it("1~10 밖이면 오류를 던진다", () => {
    for (const effort of [0, 11, Number.NaN]) {
      expect(() => intensityFromEffort(effort)).toThrow(RangeError);
    }
  });
});

describe("getMaxIntensity - 어제 기준 허용 강도", () => {
  it("어제 운동을 쉬었으면 보통까지", () => {
    expect(getMaxIntensity(rested(8, 1))).toBe("moderate");
  });

  it.each([
    [2, "moderate"], // 어제 가벼움 → 보통까지
    [5, "high"], // 어제 보통 → 높음까지
    [9, "high"], // 어제 높음 → 높음이 마지막 단계
  ] as const)("어제 힘든 정도 %i → %s까지", (effort, expected) => {
    expect(getMaxIntensity(input("cardio", 60, effort, 8, 1))).toBe(expected);
  });

  it("쉰 사람이 어제 가볍게 운동한 사람보다 높은 강도를 받지 않는다", () => {
    const light = getMaxIntensity(input("yoga", 30, 1, 8, 1));
    const rest = getMaxIntensity(rested(8, 1));
    expect(step(rest)).toBeLessThanOrEqual(step(light));
  });
});

describe("determineIntensity - DESIGN 시험 표", () => {
  it.each([
    ["#1 쉰 날, 수면 8, 근육통 1 (100점이지만 쉰 날이라 보통)", rested(8, 1), "moderate"],
    ["#2 유산소 60분 힘든 5, 수면 4.5, 근육통 2 (50점)", input("cardio", 60, 5, 4.5, 2), "light"],
    ["#3 요가 30분 힘든 3, 수면 7, 근육통 4 (상한으로 60점)", input("yoga", 30, 3, 7, 4), "light"],
    ["#4 근력 100분 힘든 9, 수면 5.5, 근육통 3 (20점)", input("strength", 100, 9, 5.5, 3), "rest"],
    ["#5 쉰 날, 수면 7, 근육통 5 (60점)", rested(7, 5), "light"],
    ["#6 근력 60분 힘든 8, 수면 7, 근육통 1 (80점)", input("strength", 60, 8, 7, 1), "high"],
    ["#7 요가 60분 힘든 2, 수면 8, 근육통 1 (100점이지만 어제가 가벼움)", input("yoga", 60, 2, 8, 1), "moderate"],
    ["#9 근력 120분 힘든 10, 수면 4, 근육통 5 (0점)", input("strength", 120, 10, 4, 5), "rest"],
    ["#10 쉰 날, 수면 4, 근육통 4 (40점)", rested(4, 4), "light"],
    ["#11 근력 60분 힘든 4, 수면 4, 근육통 4 (30점)", input("strength", 60, 4, 4, 4), "rest"],
    ["#12 근력 60분 힘든 7, 수면 7, 근육통 2 (70점)", input("strength", 60, 7, 7, 2), "moderate"],
    ["#13 유산소 45분 힘든 5, 수면 8, 근육통 1 (90점, 어제 보통 → 오늘 높음 허용)", input("cardio", 45, 5, 8, 1), "high"],
  ] as const)("%s → %s", (_name, value, expected) => {
    expect(determineIntensity(value).intensity).toBe(expected);
  });

  it("#14 쉰 날에 수면만 달라지면 보통 / 보통 / 보통 / 가벼움 (4.5시간은 상한으로 60점)", () => {
    const results = [7, 6, 5, 4.5].map((sleep) => determineIntensity(rested(sleep, 1)).intensity);
    expect(results).toEqual(["moderate", "moderate", "moderate", "light"]);
  });

  it("#16 어제 힘든 정도만 달라지면 보통 / 높음 / 높음 / 높음 / 높음 / 보통", () => {
    const results = [3, 4, 6, 7, 8, 9].map(
      (effort) => determineIntensity(input("cardio", 60, effort, 8, 1)).intensity,
    );
    expect(results).toEqual(["moderate", "high", "high", "high", "high", "moderate"]);
  });

  it("#8 같은 입력이면 항상 같은 결과가 나온다", () => {
    const value = input("sports", 80, 6, 6.5, 3);
    expect(determineIntensity(value)).toEqual(determineIntensity({ ...value }));
  });
});

describe("determineIntensity - 결과 설명 값", () => {
  it("어제 기준 제한 때문에 낮아졌으면 limited가 true이다", () => {
    expect(determineIntensity(rested(8, 1))).toEqual({
      intensity: "moderate",
      scoreIntensity: "high",
      maxIntensity: "moderate",
      limited: true,
    });
  });

  it("점수로 정한 강도가 허용 범위 안이면 limited가 false이다", () => {
    expect(determineIntensity(input("cardio", 45, 5, 8, 1))).toEqual({
      intensity: "high",
      scoreIntensity: "high",
      maxIntensity: "high",
      limited: false,
    });
  });

  it("점수가 낮아서 허용 강도보다 낮은 경우는 limited가 false이다", () => {
    const result = determineIntensity(input("strength", 100, 9, 5.5, 3));
    expect(result.intensity).toBe("rest");
    expect(result.limited).toBe(false);
  });
});

describe("determineIntensity - 모든 입력 조합", () => {
  const cases: RecoveryInput[] = [];
  for (let soreness = 1; soreness <= 5; soreness += 1) {
    for (let sleep = 0; sleep <= 14; sleep += 0.5) {
      cases.push(rested(sleep, soreness));
      for (let effort = 1; effort <= 10; effort += 1) {
        cases.push(input("cardio", 60, effort, sleep, soreness));
      }
      // 어제 운동을 두 개 했을 때(힘든 정도가 서로 다른 조합)도 함께 본다.
      for (const [effortA, effortB] of [[2, 9], [9, 2], [3, 3], [6, 8], [10, 10]]) {
        cases.push(
          multi(
            [
              { type: "cardio", minutes: 50, effort: effortA },
              { type: "yoga", minutes: 50, effort: effortB },
            ],
            sleep,
            soreness,
          ),
        );
      }
    }
  }

  it("점수가 40점 미만이면 항상 휴식이다", () => {
    for (const value of cases) {
      if (calculateScore(value).score < 40) expect(determineIntensity(value).intensity).toBe("rest");
    }
  });

  it("오늘 강도는 점수로 정한 강도와 어제 기준 허용 강도를 넘지 않는다", () => {
    for (const value of cases) {
      const result = determineIntensity(value);
      expect(step(result.intensity)).toBeLessThanOrEqual(step(result.scoreIntensity));
      expect(step(result.intensity)).toBeLessThanOrEqual(step(result.maxIntensity));
      expect([result.scoreIntensity, result.maxIntensity]).toContain(result.intensity);
    }
  });

  it("어제 운동을 했으면 어제 강도보다 한 단계 넘게 올라가지 않는다", () => {
    for (const value of cases) {
      if (value.yesterdayWorkouts.length === 0) continue;
      // 여러 개를 했으면 가장 힘들었던 운동의 힘든 정도로 어제 강도를 본다.
      const yesterday = intensityFromEffort(Math.max(...value.yesterdayWorkouts.map((workout) => workout.effort)));
      expect(step(determineIntensity(value).intensity)).toBeLessThanOrEqual(step(yesterday) + 1);
    }
  });

  it("어제 운동을 쉬었으면 보통을 넘지 않는다", () => {
    for (const value of cases) {
      if (value.yesterdayWorkouts.length > 0) continue;
      expect(step(determineIntensity(value).intensity)).toBeLessThanOrEqual(step("moderate"));
    }
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("오류를 던진다", () => {
    expect(() => determineIntensity(rested(8, 7))).toThrow(RangeError);
    expect(() => determineIntensity(input("cardio", 60, 11, 8, 1))).toThrow(RangeError);
  });
});
