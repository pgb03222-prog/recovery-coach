// 운동 종류 추천(exercises.ts)이 DESIGN §4.3과 PRD의 "AI가 지킬 규칙"대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { EXERCISE_CANDIDATES, recommendExercises } from "./exercises";
import { determineIntensity } from "./intensity";
import type { Intensity, RecoveryInput, YesterdayType } from "./types";

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

const names = (list: { name: string }[]) => list.map((item) => item.name);

describe("강도별 후보", () => {
  it("휴식은 쉬기·걷기·스트레칭만 추천한다 (PRD: 40점 미만은 휴식이나 가벼운 활동만)", () => {
    const result = recommendExercises(input("strength", 60, 5, 8, 1), "rest");
    expect(names(result)).toEqual(["충분히 쉬기", "가벼운 걷기 20분", "스트레칭"]);
    for (const item of result) expect(["rest", "cardio", "yoga"]).toContain(item.category);
  });

  it.each([
    ["light", ["가벼운 걷기 30분", "요가·스트레칭 20분", "가벼운 맨몸 근력 운동"]],
    ["moderate", ["가벼운 조깅이나 자전거", "보통 무게 전신 근력 운동", "가벼운 구기 운동"]],
    ["high", ["인터벌 달리기", "고중량 근력 운동", "경기 형태 구기 운동"]],
  ] as const)("%s는 후보 3개를 표의 순서대로 추천한다", (intensity, expected) => {
    expect(names(recommendExercises(input("yoga", 30, 2, 8, 1), intensity))).toEqual(expected);
  });
});

describe("어제 힘든 정도 8 이상이면 높음에서 같은 종류를 뺀다", () => {
  it("#6 근력 60분 힘든 8 → 근력 제외", () => {
    const value = input("strength", 60, 8, 7, 1);
    const { intensity } = determineIntensity(value);
    expect(intensity).toBe("high");
    expect(names(recommendExercises(value, intensity))).toEqual(["인터벌 달리기", "경기 형태 구기 운동"]);
  });

  it.each([
    ["cardio", ["고중량 근력 운동", "경기 형태 구기 운동"]],
    ["strength", ["인터벌 달리기", "경기 형태 구기 운동"]],
    ["sports", ["인터벌 달리기", "고중량 근력 운동"]],
  ] as const)("어제 %s, 힘든 정도 8 → 같은 종류 제외", (type, expected) => {
    expect(names(recommendExercises(input(type, 60, 8, 8, 1), "high"))).toEqual(expected);
  });

  it.each([8, 9, 10])("힘든 정도 %i도 제외한다", (effort) => {
    expect(names(recommendExercises(input("strength", 60, effort, 8, 1), "high"))).toHaveLength(2);
  });

  it("힘든 정도 7 이하이면 제외하지 않는다", () => {
    expect(recommendExercises(input("strength", 60, 7, 8, 1), "high")).toHaveLength(3);
  });

  it("요가는 높음 후보에 없어서 빠지는 것이 없다", () => {
    expect(recommendExercises(input("yoga", 60, 9, 8, 1), "high")).toHaveLength(3);
  });

  it("기타를 골랐으면 빠지는 후보가 없다", () => {
    expect(recommendExercises(input("other", 60, 9, 8, 1), "high")).toHaveLength(3);
  });

  it("어제 운동을 쉬었으면 빠지는 후보가 없다", () => {
    expect(recommendExercises(rested(8, 1), "high")).toHaveLength(3);
  });

  it("높음이 아니면 힘든 정도가 8 이상이어도 제외하지 않는다", () => {
    const result = recommendExercises(input("strength", 60, 9, 8, 1), "moderate");
    expect(names(result)).toContain("보통 무게 전신 근력 운동");
    expect(result).toHaveLength(3);
  });
});

describe("추천 항목", () => {
  it("모든 후보에 이름, 종류, 한 줄 이유가 있고 이름이 겹치지 않는다", () => {
    const all = Object.values(EXERCISE_CANDIDATES).flat();
    for (const item of all) {
      expect(item.name.trim()).not.toBe("");
      expect(item.reason.trim()).not.toBe("");
      expect(item.reason).not.toContain("\n");
    }
    expect(new Set(all.map((item) => item.name)).size).toBe(all.length);
  });

  it("돌려받은 목록을 고쳐도 후보 표는 바뀌지 않는다", () => {
    const first = recommendExercises(rested(8, 1), "light");
    first[0].name = "바뀐 이름";
    first.pop();
    expect(names(recommendExercises(rested(8, 1), "light"))).toEqual([
      "가벼운 걷기 30분",
      "요가·스트레칭 20분",
      "가벼운 맨몸 근력 운동",
    ]);
  });

  it("같은 입력이면 항상 같은 추천이 나온다", () => {
    const value = input("sports", 80, 8, 7, 1);
    expect(recommendExercises(value, "high")).toEqual(recommendExercises({ ...value }, "high"));
  });
});

describe("모든 입력 조합 (강도는 determineIntensity로 정한다)", () => {
  const cases: RecoveryInput[] = [];
  const types: YesterdayType[] = ["cardio", "strength", "sports", "yoga", "other"];
  for (let soreness = 1; soreness <= 5; soreness += 1) {
    for (let sleep = 0; sleep <= 14; sleep += 0.5) {
      cases.push(rested(sleep, soreness));
      for (const type of types) {
        for (let effort = 1; effort <= 10; effort += 1) {
          cases.push(input(type, 60, effort, sleep, soreness));
        }
      }
    }
  }

  it("추천은 항상 1~3개이고 각각 이유가 있다", () => {
    for (const value of cases) {
      const result = recommendExercises(value, determineIntensity(value).intensity);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(3);
      for (const item of result) expect(item.reason.trim()).not.toBe("");
    }
  });

  it("강도가 휴식이면 걷기·스트레칭·쉬기만 추천한다", () => {
    for (const value of cases) {
      const intensity: Intensity = determineIntensity(value).intensity;
      if (intensity !== "rest") continue;
      for (const item of recommendExercises(value, intensity)) {
        expect(["rest", "cardio", "yoga"]).toContain(item.category);
      }
    }
  });

  it("어제 힘든 정도 8 이상이고 오늘이 높음이면 어제와 같은 종류가 없다", () => {
    for (const value of cases) {
      const { intensity } = determineIntensity(value);
      if (intensity !== "high" || value.yesterdayType === "none" || (value.yesterdayEffort ?? 0) < 8) continue;
      for (const item of recommendExercises(value, intensity)) {
        expect(item.category).not.toBe(value.yesterdayType);
      }
    }
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("운동을 했는데 힘든 정도가 없으면 오류를 던진다", () => {
    expect(() => recommendExercises(input("cardio", 60, undefined, 8, 1), "high")).toThrow(RangeError);
  });
});
