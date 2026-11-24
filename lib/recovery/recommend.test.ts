// 점수부터 추천까지 이어 붙인 결과(recommend.ts)를 확인한다. (PLAN 8번의 "한 번에 이어서 확인하는 시험")
// DESIGN §10.1 시험 표의 예시를 최종 결과로 확인하고, PRD의 "AI가 지킬 규칙"이 모든 조합에서 지켜지는지 본다.

import { describe, expect, it } from "vitest";
import { calculateRecovery } from "./recommend";
import { CONSULT_NOTICE, SEVERE_SORENESS_NOTICE } from "./notices";
import type { RecoveryInput, WorkoutType } from "./types";
import { input, multi, rested } from "../test-support/inputs";

const names = (value: RecoveryInput) => calculateRecovery(value).recommendations.map((item) => item.name);

describe("calculateRecovery - DESIGN 시험 표", () => {
  it("#1 쉰 날, 수면 8, 근육통 1 → 100점이지만 쉰 날이라 보통", () => {
    const result = calculateRecovery(rested(8, 1));
    expect(result.score).toBe(100);
    expect(result.scoreReasons).toEqual(["감점 요인이 없어요"]);
    expect(result.intensity).toBe("moderate");
    expect(names(rested(8, 1))).toEqual(["가벼운 조깅이나 자전거", "보통 무게 전신 근력 운동", "가벼운 구기 운동"]);
    expect(result.notices).toEqual([CONSULT_NOTICE]);
    expect(result.explanation).toBe(
      "오늘 회복 점수는 100점이에요. 감점 요인이 없어요. 그래서 오늘은 보통 강도의 운동을 추천해요.",
    );
    expect(result.explanationSource).toBe("rule");
  });

  it("#2 유산소 60분 힘든 5, 수면 4.5, 근육통 2 → 50점, 가벼움", () => {
    const result = calculateRecovery(input("cardio", 60, 5, 4.5, 2));
    expect(result.score).toBe(50);
    expect(result.scoreReasons).toEqual([
      "수면이 5시간 미만이라 30점 줄었어요",
      "근육통이 2점이라 10점 줄었어요",
      "어제 힘든 정도가 10점 중 5점이라 10점 줄었어요",
    ]);
    expect(result.intensity).toBe("light");
  });

  it("#3 요가 30분 힘든 3, 수면 7, 근육통 4 → 70점이지만 상한으로 60점, 가벼움", () => {
    const result = calculateRecovery(input("yoga", 30, 3, 7, 4));
    expect(result.score).toBe(60);
    expect(result.scoreReasons).toEqual(["근육통이 4점이라 30점 줄었어요", "근육통 때문에 점수가 60점까지만 나와요"]);
    expect(result.intensity).toBe("light");
  });

  it("#4 근력 100분 힘든 9, 수면 5.5, 근육통 3 → 20점, 휴식 (걷기·스트레칭만)", () => {
    const value = input("strength", 100, 9, 5.5, 3);
    const result = calculateRecovery(value);
    expect(result.score).toBe(20);
    expect(result.intensity).toBe("rest");
    expect(names(value)).toEqual(["충분히 쉬기", "천천히 걷기", "스트레칭"]);
    expect(result.explanation).toContain("쉬거나 가볍게 몸을 푸는 것");
  });

  it("#5 쉰 날, 수면 7, 근육통 5 → 60점, 가벼움, 추가 안내 문구", () => {
    const result = calculateRecovery(rested(7, 5));
    expect(result.score).toBe(60);
    expect(result.intensity).toBe("light");
    expect(result.notices).toEqual([CONSULT_NOTICE, SEVERE_SORENESS_NOTICE]);
  });

  it("#6 근력 60분 힘든 8, 수면 7, 근육통 1 → 80점, 높음, 추천에서 근력 제외", () => {
    const value = input("strength", 60, 8, 7, 1);
    const result = calculateRecovery(value);
    expect(result.score).toBe(80);
    expect(result.intensity).toBe("high");
    expect(names(value)).toEqual(["인터벌 달리기", "경기 형태 구기 운동"]);
  });

  it("#7 요가 60분 힘든 2, 수면 8, 근육통 1 → 100점이지만 어제가 가벼움이라 보통", () => {
    const result = calculateRecovery(input("yoga", 60, 2, 8, 1));
    expect(result.score).toBe(100);
    expect(result.intensity).toBe("moderate");
  });

  it("#8 같은 입력을 두 번 → 결과가 항상 같다", () => {
    const value = input("sports", 80, 6, 6.5, 3);
    expect(calculateRecovery(value)).toEqual(calculateRecovery({ ...value }));
  });

  it("#9 근력 120분 힘든 10, 수면 4, 근육통 5 → 0점, 휴식", () => {
    const result = calculateRecovery(input("strength", 120, 10, 4, 5));
    expect(result.score).toBe(0);
    expect(result.intensity).toBe("rest");
  });

  it("#13 유산소 45분 힘든 5, 수면 8, 근육통 1 → 90점, 어제 보통이라 오늘 높음 허용", () => {
    const result = calculateRecovery(input("cardio", 45, 5, 8, 1));
    expect(result.score).toBe(90);
    expect(result.intensity).toBe("high");
  });
});

describe("calculateRecovery - 모든 입력 조합에서 PRD 규칙 확인", () => {
  const cases: RecoveryInput[] = [];
  const types: WorkoutType[] = ["cardio", "strength", "sports", "yoga", "other"];
  for (let soreness = 1; soreness <= 5; soreness += 1) {
    for (let sleep = 0; sleep <= 14; sleep += 0.5) {
      cases.push(rested(sleep, soreness));
      for (const type of types) {
        for (const effort of [1, 3, 4, 6, 7, 8, 9, 10]) {
          cases.push(input(type, 60, effort, sleep, soreness));
        }
      }

      // 어제 운동을 두 개 한 경우도 함께 본다. (종류 2개 × 힘든 정도 조합, 근력은 부위를 바꿔 가며)
      for (let first = 0; first < types.length; first += 1) {
        for (let second = first + 1; second < types.length; second += 1) {
          for (const effortA of [3, 8, 10]) {
            for (const effortB of [2, 8, 9]) {
              const parts = (type: WorkoutType) => (type === "strength" ? { strengthParts: ["upper" as const, "lower" as const] } : {});
              cases.push(
                multi(
                  [
                    { type: types[first], minutes: 50, effort: effortA, ...parts(types[first]) },
                    { type: types[second], minutes: 50, effort: effortB, ...parts(types[second]) },
                  ],
                  sleep,
                  soreness,
                ),
              );
            }
          }
        }
      }
    }
  }
  const results = cases.map((value) => ({ value, result: calculateRecovery(value) }));

  it("점수 근거는 항상 한 줄 이상이고 추천은 1~3개이며 각각 이유가 있다", () => {
    for (const { result } of results) {
      expect(result.scoreReasons.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
      for (const item of result.recommendations) expect(item.reason.trim()).not.toBe("");
    }
  });

  it("점수는 0~100이고, 근육통 4점 이상이거나 수면 5시간 미만이면 60점을 넘지 않는다", () => {
    for (const { value, result } of results) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      if (value.soreness >= 4 || value.sleepHours < 5) expect(result.score).toBeLessThanOrEqual(60);
    }
  });

  it("점수가 40점 미만이면 걷기·스트레칭·쉬기만 추천한다", () => {
    for (const { result } of results) {
      if (result.score >= 40) continue;
      expect(result.intensity).toBe("rest");
      for (const item of result.recommendations) expect(["rest", "cardio", "yoga"]).toContain(item.category);
    }
  });

  it("어제 힘든 정도가 8 이상이고 오늘이 높음이면 어제와 같은 종류를 추천하지 않는다", () => {
    for (const { value, result } of results) {
      const hardTypes: string[] = value.yesterdayWorkouts.filter((workout) => workout.effort >= 8).map((workout) => workout.type);
      if (result.intensity !== "high" || hardTypes.length === 0) continue;
      for (const item of result.recommendations) expect(hardTypes).not.toContain(item.category);
    }
  });

  it("상담 문구는 항상 있고, 근육통 5점일 때만 추가 안내가 붙는다", () => {
    for (const { value, result } of results) {
      expect(result.notices[0]).toBe(CONSULT_NOTICE);
      expect(result.notices.includes(SEVERE_SORENESS_NOTICE)).toBe(value.soreness === 5);
    }
  });

  it("진단이나 치료를 말하는 표현이 없다", () => {
    const banned = ["진단", "치료", "부상입니다"];
    for (const { result } of results) {
      const text = [...result.scoreReasons, ...result.notices, result.explanation, ...result.recommendations.flatMap((item) => [item.name, item.reason])].join(" ");
      for (const word of banned) expect(text).not.toContain(word);
    }
  });

  it("외부 AI를 연결하기 전이므로 설명은 항상 규칙 문장이다", () => {
    for (const { result } of results) expect(result.explanationSource).toBe("rule");
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("오류를 던진다", () => {
    expect(() => calculateRecovery(rested(8, 7))).toThrow(RangeError);
  });
});
