// 운동 종류 추천(exercises.ts)이 DESIGN §4.3과 PRD의 "AI가 지킬 규칙"대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { EXERCISE_CANDIDATES, STRENGTH_DETAILS, STRENGTH_EXERCISES, recommendExercises } from "./exercises";
import { determineIntensity } from "./intensity";
import type { Intensity, RecoveryInput, WorkoutType } from "./types";
import { input, multi, rested } from "../test-support/inputs";

const names = (list: { name: string }[]) => list.map((item) => item.name);

describe("강도별 후보", () => {
  it("휴식은 쉬기·걷기·스트레칭만 추천한다 (PRD: 40점 미만은 휴식이나 가벼운 활동만)", () => {
    const result = recommendExercises(input("strength", 60, 5, 8, 1), "rest");
    expect(names(result)).toEqual(["충분히 쉬기", "천천히 걷기", "스트레칭"]);
    for (const item of result) expect(["rest", "cardio", "yoga"]).toContain(item.category);
  });

  it.each([
    ["light", ["가벼운 걷기", "요가·스트레칭", "가벼운 맨몸 전신 근력 운동"]],
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
    // 어제 상체를 썼으니 오늘 근력은 하체로 바뀌지만, 강도가 높음이 아니라서 근력 후보 자체는 빠지지 않는다.
    expect(names(result)).toContain(STRENGTH_EXERCISES.lower.moderate);
    expect(result).toHaveLength(3);
  });
});

describe("추천 항목", () => {
  it("모든 후보에 이름, 종류, 한 줄 이유가 있고 이름이 겹치지 않는다", () => {
    // 근력 칸은 어제 쓴 부위에 따라 이름이 정해지므로 표에는 자리만 있다. 근력 이름은 부위별 표에서 따로 확인한다.
    const fixed = Object.values(EXERCISE_CANDIDATES)
      .flat()
      .filter((item): item is Extract<typeof item, { name: string }> => "name" in item);
    const strengthNames = Object.values(STRENGTH_EXERCISES).flatMap((byIntensity) => Object.values(byIntensity));
    const all = [...fixed, ...strengthNames.map((name) => ({ name, reason: "근력" }))];
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
      "가벼운 걷기",
      "요가·스트레칭",
      "가벼운 맨몸 전신 근력 운동",
    ]);
  });

  it("같은 입력이면 항상 같은 추천이 나온다", () => {
    const value = input("sports", 80, 8, 7, 1);
    expect(recommendExercises(value, "high")).toEqual(recommendExercises({ ...value }, "high"));
  });
});

describe("모든 입력 조합 (강도는 determineIntensity로 정한다)", () => {
  const cases: RecoveryInput[] = [];
  const types: WorkoutType[] = ["cardio", "strength", "sports", "yoga", "other"];
  for (let soreness = 1; soreness <= 5; soreness += 1) {
    for (let sleep = 0; sleep <= 14; sleep += 0.5) {
      cases.push(rested(sleep, soreness));
      for (const type of types) {
        for (let effort = 1; effort <= 10; effort += 1) {
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
      const hardTypes = value.yesterdayWorkouts.filter((workout) => workout.effort >= 8).map((workout) => workout.type);
      if (intensity !== "high" || hardTypes.length === 0) continue;
      for (const item of recommendExercises(value, intensity)) {
        expect(hardTypes as string[]).not.toContain(item.category);
      }
    }
  });
});

describe("근력 운동 세부 추천 (어제 쓴 부위를 피한다)", () => {
  const strengthToday = (value: RecoveryInput, intensity: Intensity) =>
    recommendExercises(value, intensity).find((item) => item.category === "strength");

  it("어제 근력을 안 했으면 전신 근력 운동을 추천한다", () => {
    expect(strengthToday(input("cardio", 30, 3, 8, 1), "moderate")?.name).toBe("보통 무게 전신 근력 운동");
    expect(strengthToday(rested(8, 1), "light")?.name).toBe("가벼운 맨몸 전신 근력 운동");
  });

  it.each([
    [["upper"], "lower"],
    [["lower"], "upper"],
    [["core"], "upper"],
    [["upper", "lower"], "core"],
    [["lower", "core"], "upper"],
    [["upper", "core"], "lower"],
  ] as const)("어제 %j를 썼으면 오늘은 %s 운동을 추천한다", (used, target) => {
    const result = strengthToday(input("strength", 40, 3, 8, 1, [...used]), "moderate");
    expect(result?.name).toBe(STRENGTH_EXERCISES[target].moderate);
  });

  it("강도에 따라 같은 부위의 운동 이름이 달라진다", () => {
    const value = input("strength", 40, 3, 8, 1, ["upper"]);
    expect(strengthToday(value, "light")?.name).toBe(STRENGTH_EXERCISES.lower.light);
    expect(strengthToday(value, "moderate")?.name).toBe(STRENGTH_EXERCISES.lower.moderate);
    expect(strengthToday(value, "high")?.name).toBe(STRENGTH_EXERCISES.lower.high);
  });

  it("이유에 어제 쓴 부위와 오늘 쓸 부위가 들어 있다", () => {
    const result = strengthToday(input("strength", 40, 3, 8, 1, ["upper", "core"]), "moderate");
    expect(result?.reason).toBe("어제 상체·코어 운동을 해서 오늘은 하체를 쓰면 회복과 균형에 좋아요");
  });

  it("상체·하체·코어를 모두 썼으면(전신) 근력 운동은 추천하지 않는다", () => {
    const result = recommendExercises(input("strength", 40, 3, 8, 1, ["upper", "lower", "core"]), "moderate");
    expect(result.some((item) => item.category === "strength")).toBe(false);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("휴식 강도에는 근력 운동이 없다", () => {
    expect(strengthToday(input("strength", 40, 3, 8, 1, ["upper"]), "rest")).toBeUndefined();
  });
});

describe("근력 운동의 참고 종목(details)", () => {
  const strengthToday = (value: RecoveryInput, intensity: Intensity) =>
    recommendExercises(value, intensity).find((item) => item.category === "strength");

  it("부위별 근력 추천에는 그 부위의 세부 종목이 붙는다", () => {
    // 어제 상체 → 오늘 하체
    const lower = strengthToday(input("strength", 40, 3, 8, 1, ["upper"]), "moderate");
    expect(lower?.details).toEqual(["고블릿 스쿼트", "런지", "힙 쓰러스트"]);
    // 어제 하체·상체 → 오늘 코어 (윗몸 일으키기 포함)
    const core = strengthToday(input("strength", 40, 3, 8, 1, ["upper", "lower"]), "moderate");
    expect(core?.details).toContain("윗몸 일으키기");
  });

  it("전신 근력 추천에는 상체·하체·코어 종목이 함께 붙는다", () => {
    const full = strengthToday(rested(8, 1), "moderate");
    expect(full?.name).toBe("보통 무게 전신 근력 운동");
    expect(full?.details).toHaveLength(3);
    expect(full?.details?.[0]).toContain("상체");
    expect(full?.details?.[1]).toContain("하체");
    expect(full?.details?.[2]).toContain("코어");
    expect(full?.details?.join(" ")).toContain("스쿼트");
    expect(full?.details?.join(" ")).toContain("윗몸 일으키기");
  });

  it("근력이 아닌 추천에는 세부 종목이 없다", () => {
    for (const item of recommendExercises(rested(8, 1), "moderate")) {
      if (item.category !== "strength") expect(item.details).toBeUndefined();
    }
  });

  it("모든 강도·부위에 세부 종목이 비어 있지 않다", () => {
    for (const byIntensity of Object.values(STRENGTH_DETAILS)) {
      for (const list of Object.values(byIntensity)) {
        expect(list.length).toBeGreaterThanOrEqual(2);
        for (const detail of list) expect(detail.trim()).not.toBe("");
      }
    }
  });

  it("돌려받은 세부 종목을 고쳐도 표는 바뀌지 않는다", () => {
    const first = strengthToday(input("strength", 40, 3, 8, 1, ["upper"]), "light");
    first?.details?.push("바뀐 종목");
    expect(strengthToday(input("strength", 40, 3, 8, 1, ["upper"]), "light")?.details).toEqual(STRENGTH_DETAILS.lower.light);
  });

  it("세부 종목은 부위 이름 표(STRENGTH_EXERCISES)의 이름과 짝이 맞는다", () => {
    expect(Object.keys(STRENGTH_DETAILS).sort()).toEqual(Object.keys(STRENGTH_EXERCISES).sort());
  });
});

describe("권장 시간(minutes)", () => {
  it("충분히 쉬기를 뺀 모든 추천에 권장 시간이 있다", () => {
    for (const intensity of ["rest", "light", "moderate", "high"] as const) {
      for (const item of recommendExercises(rested(8, 1), intensity)) {
        if (item.category === "rest") expect(item.minutes).toBeUndefined();
        else expect(item.minutes).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("강도별 시간: 휴식 20·10분, 가벼움 30·20·15분, 보통 30분, 높음 25·40·40분", () => {
    const minutes = (intensity: Intensity) => recommendExercises(rested(8, 1), intensity).map((item) => item.minutes);
    expect(minutes("rest")).toEqual([undefined, 20, 10]);
    expect(minutes("light")).toEqual([30, 20, 15]);
    expect(minutes("moderate")).toEqual([30, 30, 30]);
    expect(minutes("high")).toEqual([25, 40, 40]);
  });

  it("근력 추천의 시간은 강도가 높을수록 길고, 부위별·전신 추천 모두 같다", () => {
    const strengthMinutes = (value: RecoveryInput, intensity: Intensity) =>
      recommendExercises(value, intensity).find((item) => item.category === "strength")?.minutes;
    const part = input("strength", 40, 3, 8, 1, ["upper"]);
    expect([strengthMinutes(part, "light"), strengthMinutes(part, "moderate"), strengthMinutes(part, "high")]).toEqual([15, 30, 40]);
    expect(strengthMinutes(rested(8, 1), "moderate")).toBe(30);
  });

  it("추천 이름에는 시간이 들어 있지 않다 (시간은 따로 보여 준다)", () => {
    for (const intensity of ["rest", "light", "moderate", "high"] as const) {
      for (const item of recommendExercises(rested(8, 1), intensity)) expect(item.name).not.toMatch(/\d+\s*분/);
    }
  });
});

describe("어제 운동을 여러 개 했을 때", () => {
  it("힘든 정도 8 이상인 종류마다 높음에서 같은 종류를 뺀다", () => {
    const value = multi(
      [
        { type: "cardio", minutes: 40, effort: 8 },
        { type: "sports", minutes: 40, effort: 9 },
        { type: "yoga", minutes: 20, effort: 2 },
      ],
      8,
      1,
    );
    expect(names(recommendExercises(value, "high"))).toEqual(["고중량 근력 운동"]);
  });

  it("힘든 정도 8 미만인 종류는 높음이어도 빼지 않는다", () => {
    const value = multi(
      [
        { type: "cardio", minutes: 40, effort: 8 },
        { type: "sports", minutes: 40, effort: 5 },
      ],
      8,
      1,
    );
    expect(names(recommendExercises(value, "high"))).toEqual(["고중량 근력 운동", "경기 형태 구기 운동"]);
  });

  it("후보가 모두 빠지면 추천이 비지 않게 가벼운 활동을 추천한다", () => {
    const value = multi(
      [
        { type: "cardio", minutes: 40, effort: 9 },
        { type: "strength", minutes: 40, effort: 9, strengthParts: ["upper"] },
        { type: "sports", minutes: 40, effort: 9 },
      ],
      8,
      1,
    );
    const result = recommendExercises(value, "high");
    expect(names(result)).toEqual(["가벼운 걷기", "요가·스트레칭"]);
  });

  it("여러 근력 항목이 아니라 한 근력 운동의 부위를 합쳐서 본다", () => {
    const value = multi([{ type: "strength", minutes: 40, effort: 3, strengthParts: ["upper", "lower"] }], 8, 1);
    expect(recommendExercises(value, "moderate").find((item) => item.category === "strength")?.name).toBe(
      STRENGTH_EXERCISES.core.moderate,
    );
  });
});
