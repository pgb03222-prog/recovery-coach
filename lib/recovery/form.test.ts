// 입력 화면의 칸 값을 입력으로 바꾸는 함수(form.ts)를 확인한다.

import { describe, expect, it } from "vitest";
import { EMPTY_FORM_VALUES, parseFormValues } from "./form";
import type { FormValues } from "./form";

/** 유산소 60분 힘든 5를 체크한 정상 입력 */
const valid: FormValues = {
  ...EMPTY_FORM_VALUES,
  selectedTypes: ["cardio"],
  workouts: { ...EMPTY_FORM_VALUES.workouts, cardio: { minutes: "60", effort: "5", parts: [] } },
  sleepHours: "6.5",
  soreness: "3",
};

function errorFields(values: FormValues): string[] {
  const result = parseFormValues(values);
  return result.ok ? [] : Object.keys(result.errors).sort();
}

/** 운동 종류 하나의 칸 값만 바꾼 입력 */
function withWorkout(type: keyof FormValues["workouts"], patch: Partial<FormValues["workouts"]["cardio"]>): FormValues {
  return { ...valid, workouts: { ...valid.workouts, [type]: { ...valid.workouts[type], ...patch } } };
}

describe("parseFormValues", () => {
  it("글자로 된 값을 숫자로 바꿔 통과시킨다", () => {
    expect(parseFormValues(valid)).toEqual({
      ok: true,
      data: { yesterdayWorkouts: [{ type: "cardio", minutes: 60, effort: 5 }], sleepHours: 6.5, soreness: 3 },
    });
  });

  it("앞뒤 공백은 지우고 읽는다", () => {
    expect(parseFormValues({ ...withWorkout("cardio", { minutes: "  45" }), sleepHours: " 7 " }).ok).toBe(true);
  });

  it("아무것도 입력하지 않으면 어제 운동 선택, 수면, 근육통을 알려 준다", () => {
    expect(errorFields(EMPTY_FORM_VALUES)).toEqual(["sleepHours", "soreness", "yesterdayWorkouts"]);
  });

  it("운동도 '안 함'도 고르지 않았을 때 안내는 사용자가 할 일을 알려 준다", () => {
    const result = parseFormValues(EMPTY_FORM_VALUES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.yesterdayWorkouts).toContain("어제 운동 안 함");
  });

  it("빈 칸은 '입력해 주세요', 숫자가 아닌 글자는 '숫자로 입력해 주세요' 안내가 나온다", () => {
    const empty = parseFormValues({ ...valid, sleepHours: "" });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.sleepHours).toBe("수면 시간을 입력해 주세요.");

    const text = parseFormValues({ ...valid, sleepHours: "많이" });
    expect(text.ok).toBe(false);
    if (!text.ok) expect(text.errors.sleepHours).toBe("수면 시간은 숫자로 입력해 주세요.");
  });

  it("쉼표 소수(6,5)는 숫자로 읽지 않는다", () => {
    expect(errorFields({ ...valid, sleepHours: "6,5" })).toEqual(["sleepHours"]);
  });

  it("고른 운동의 시간과 힘든 정도가 빈 칸이면 두 칸 모두 알려 준다", () => {
    expect(errorFields(withWorkout("cardio", { minutes: "", effort: "" }))).toEqual([
      "yesterdayWorkouts.cardio.effort",
      "yesterdayWorkouts.cardio.minutes",
    ]);
  });

  it("범위와 단위 안내는 검사 함수와 같다", () => {
    expect(errorFields({ ...valid, sleepHours: "20" })).toEqual(["sleepHours"]);
    expect(errorFields({ ...valid, sleepHours: "6.3" })).toEqual(["sleepHours"]);
    expect(errorFields(withWorkout("cardio", { minutes: "4" }))).toEqual(["yesterdayWorkouts.cardio.minutes"]);
    expect(errorFields(withWorkout("cardio", { effort: "11" }))).toEqual(["yesterdayWorkouts.cardio.effort"]);
    expect(errorFields({ ...valid, soreness: "0" })).toEqual(["soreness"]);
  });

  describe("어제 운동 안 함", () => {
    it("골랐으면 빈 목록으로 통과하고, 운동 칸의 값은 비어 있어도 잘못돼 있어도 무시한다", () => {
      expect(parseFormValues({ ...EMPTY_FORM_VALUES, rested: true, sleepHours: "8", soreness: "1" })).toEqual({
        ok: true,
        data: { yesterdayWorkouts: [], sleepHours: 8, soreness: 1 },
      });
      const messy = withWorkout("cardio", { minutes: "abc", effort: "99" });
      expect(parseFormValues({ ...messy, rested: true, selectedTypes: ["cardio"] }).ok).toBe(true);
    });
  });

  describe("어제 운동 여러 개", () => {
    const many: FormValues = {
      ...valid,
      selectedTypes: ["yoga", "cardio", "strength"], // 고른 순서와 화면 순서가 다르다
      workouts: {
        ...valid.workouts,
        cardio: { minutes: "30", effort: "4", parts: [] },
        yoga: { minutes: "20", effort: "2", parts: [] },
        strength: { minutes: "40", effort: "7", parts: ["core", "upper"] },
      },
    };

    it("체크한 종류만 화면에 보이는 순서로 보내고, 근력은 쓴 부위도 보낸다", () => {
      expect(parseFormValues(many)).toEqual({
        ok: true,
        data: {
          yesterdayWorkouts: [
            { type: "cardio", minutes: 30, effort: 4 },
            { type: "strength", minutes: 40, effort: 7, strengthParts: ["upper", "core"] },
            { type: "yoga", minutes: 20, effort: 2 },
          ],
          sleepHours: 6.5,
          soreness: 3,
        },
      });
    });

    it("체크하지 않은 종류에 남아 있는 값은 무시한다", () => {
      const leftover = { ...valid, workouts: { ...valid.workouts, sports: { minutes: "abc", effort: "99", parts: [] } } };
      expect(parseFormValues(leftover)).toEqual(parseFormValues(valid));
    });

    it("근력을 골랐는데 부위를 안 골랐으면 부위 칸을 알려 준다", () => {
      const noParts = { ...many, workouts: { ...many.workouts, strength: { minutes: "40", effort: "7", parts: [] } } };
      expect(errorFields(noParts)).toEqual(["yesterdayWorkouts.strength.strengthParts"]);
    });

    it("종류마다 틀린 칸을 따로 알려 준다", () => {
      const broken = {
        ...many,
        workouts: {
          ...many.workouts,
          cardio: { minutes: "", effort: "4", parts: [] },
          yoga: { minutes: "20", effort: "", parts: [] },
        },
      };
      expect(errorFields(broken)).toEqual(["yesterdayWorkouts.cardio.minutes", "yesterdayWorkouts.yoga.effort"]);
    });
  });

  it("처음 상태(EMPTY_FORM_VALUES)는 아무것도 고르지 않고 모든 칸이 비어 있다", () => {
    expect(EMPTY_FORM_VALUES.rested).toBe(false);
    expect(EMPTY_FORM_VALUES.selectedTypes).toEqual([]);
    expect(EMPTY_FORM_VALUES.sleepHours).toBe("");
    expect(EMPTY_FORM_VALUES.soreness).toBe("");
    for (const workout of Object.values(EMPTY_FORM_VALUES.workouts)) {
      expect(workout).toEqual({ minutes: "", effort: "", parts: [] });
    }
  });
});
