// 입력 검사(validate.ts)가 DESIGN §4.6의 규칙대로 동작하는지 확인한다.

import { describe, expect, it } from "vitest";
import { validateRecoveryInput } from "./validate";

/** 어제 운동 하나(유산소 60분, 힘든 5) */
const cardio = { type: "cardio", minutes: 60, effort: 5 };

/** 정상 입력의 기본값. 시험마다 필요한 칸만 바꿔서 쓴다. */
const valid = {
  yesterdayWorkouts: [cardio],
  sleepHours: 6.5,
  soreness: 3,
};

/** 오류 칸 이름만 뽑아 본다. */
function errorFields(raw: unknown): string[] {
  const result = validateRecoveryInput(raw);
  return result.ok ? [] : Object.keys(result.errors).sort();
}

/** 어제 운동 하나만 바꾼 입력을 만든다. */
const withWorkout = (change: object) => ({ ...valid, yesterdayWorkouts: [{ ...cardio, ...change }] });

describe("validateRecoveryInput", () => {
  it("정상 입력은 그대로 통과한다", () => {
    expect(validateRecoveryInput(valid)).toEqual({ ok: true, data: valid });
  });

  describe("어제 운동 안 함 (빈 목록)", () => {
    it("빈 목록이면 통과한다", () => {
      const result = validateRecoveryInput({ yesterdayWorkouts: [], sleepHours: 8, soreness: 1 });
      expect(result).toEqual({ ok: true, data: { yesterdayWorkouts: [], sleepHours: 8, soreness: 1 } });
    });

    it("어제 운동 목록 자체가 없으면 오류이다", () => {
      expect(errorFields({ sleepHours: 8, soreness: 1 })).toEqual(["yesterdayWorkouts"]);
      expect(errorFields({ yesterdayWorkouts: null, sleepHours: 8, soreness: 1 })).toEqual(["yesterdayWorkouts"]);
      expect(errorFields({ yesterdayWorkouts: "cardio", sleepHours: 8, soreness: 1 })).toEqual(["yesterdayWorkouts"]);
    });
  });

  describe("어제 운동 여러 개", () => {
    it("종류가 다르면 여러 개도 통과하고, 입력 순서를 지킨다", () => {
      const workouts = [
        { type: "yoga", minutes: 20, effort: 2 },
        { type: "strength", minutes: 40, effort: 7, strengthParts: ["upper", "core"] },
        { type: "sports", minutes: 30, effort: 6 },
      ];
      const result = validateRecoveryInput({ ...valid, yesterdayWorkouts: workouts });
      expect(result).toEqual({ ok: true, data: { ...valid, yesterdayWorkouts: workouts } });
    });

    it("5가지 종류를 모두 고를 수 있다", () => {
      const all = ["cardio", "strength", "sports", "yoga", "other"].map((type) => ({
        type,
        minutes: 10,
        effort: 3,
        ...(type === "strength" ? { strengthParts: ["lower"] } : {}),
      }));
      expect(validateRecoveryInput({ ...valid, yesterdayWorkouts: all }).ok).toBe(true);
    });

    it("같은 종류가 두 번 있으면 오류이다", () => {
      expect(errorFields({ ...valid, yesterdayWorkouts: [cardio, { ...cardio, minutes: 30 }] })).toEqual(["yesterdayWorkouts"]);
    });

    it("종류가 5개를 넘게 오면 오류이다", () => {
      expect(errorFields({ ...valid, yesterdayWorkouts: Array.from({ length: 6 }, () => cardio) })).toEqual(["yesterdayWorkouts"]);
    });

    it("없는 종류이거나 객체가 아니면 오류이다", () => {
      expect(errorFields({ ...valid, yesterdayWorkouts: [{ ...cardio, type: "swim" }] })).toEqual(["yesterdayWorkouts"]);
      expect(errorFields({ ...valid, yesterdayWorkouts: ["cardio"] })).toEqual(["yesterdayWorkouts"]);
      expect(errorFields({ ...valid, yesterdayWorkouts: [null] })).toEqual(["yesterdayWorkouts"]);
    });

    it('"none"은 더 이상 종류가 아니다 (빈 목록으로 보낸다)', () => {
      expect(errorFields({ ...valid, yesterdayWorkouts: [{ type: "none", minutes: 10, effort: 3 }] })).toEqual(["yesterdayWorkouts"]);
    });

    it("종류마다 칸 이름이 따로이고, 안내 문구에 운동 이름이 들어 있다", () => {
      const result = validateRecoveryInput({
        ...valid,
        yesterdayWorkouts: [
          { type: "cardio", minutes: 60 },
          { type: "sports", effort: 4 },
        ],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(Object.keys(result.errors).sort()).toEqual(["yesterdayWorkouts.cardio.effort", "yesterdayWorkouts.sports.minutes"]);
        expect(result.errors["yesterdayWorkouts.cardio.effort"]).toContain("유산소");
        expect(result.errors["yesterdayWorkouts.sports.minutes"]).toContain("구기·스포츠");
      }
    });
  });

  describe("근력 운동의 쓴 부위", () => {
    const strength = { type: "strength", minutes: 40, effort: 5 };
    const partsOf = (strengthParts: unknown) => ({ ...valid, yesterdayWorkouts: [{ ...strength, strengthParts }] });

    it("부위가 없으면 오류이다", () => {
      expect(errorFields({ ...valid, yesterdayWorkouts: [strength] })).toEqual(["yesterdayWorkouts.strength.strengthParts"]);
      expect(errorFields(partsOf([]))).toEqual(["yesterdayWorkouts.strength.strengthParts"]);
    });

    it("없는 부위나 목록이 아니면 오류이다", () => {
      expect(errorFields(partsOf(["arms"]))).toEqual(["yesterdayWorkouts.strength.strengthParts"]);
      expect(errorFields(partsOf("upper"))).toEqual(["yesterdayWorkouts.strength.strengthParts"]);
    });

    it("부위 여러 개는 통과하고, 겹친 부위는 한 번만 남긴다", () => {
      const result = validateRecoveryInput(partsOf(["lower", "upper", "lower"]));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.yesterdayWorkouts[0].strengthParts).toEqual(["lower", "upper"]);
    });

    it("근력이 아닌 운동에 온 부위는 결과에 넣지 않는다", () => {
      const result = validateRecoveryInput(withWorkout({ strengthParts: ["upper"] }));
      expect(result).toEqual({ ok: true, data: valid });
    });
  });

  describe("범위와 단위", () => {
    it.each([
      ["수면 0시간", { sleepHours: 0 }, true],
      ["수면 14시간", { sleepHours: 14 }, true],
      ["수면 -0.5시간", { sleepHours: -0.5 }, false],
      ["수면 14.5시간", { sleepHours: 14.5 }, false],
      ["수면 6.3시간 (0.5 단위 아님)", { sleepHours: 6.3 }, false],
      ["근육통 1", { soreness: 1 }, true],
      ["근육통 5", { soreness: 5 }, true],
      ["근육통 0", { soreness: 0 }, false],
      ["근육통 6", { soreness: 6 }, false],
      ["근육통 2.5 (정수 아님)", { soreness: 2.5 }, false],
    ])("%s", (_name, change, shouldPass) => {
      expect(validateRecoveryInput({ ...valid, ...change }).ok).toBe(shouldPass);
    });

    it.each([
      ["운동 5분", { minutes: 5 }, true],
      ["운동 240분", { minutes: 240 }, true],
      ["운동 4분", { minutes: 4 }, false],
      ["운동 241분", { minutes: 241 }, false],
      ["운동 60.5분 (정수 아님)", { minutes: 60.5 }, false],
      ["힘든 정도 1", { effort: 1 }, true],
      ["힘든 정도 10", { effort: 10 }, true],
      ["힘든 정도 0", { effort: 0 }, false],
      ["힘든 정도 11", { effort: 11 }, false],
      ["힘든 정도 5.5 (정수 아님)", { effort: 5.5 }, false],
    ])("%s", (_name, change, shouldPass) => {
      expect(validateRecoveryInput(withWorkout(change)).ok).toBe(shouldPass);
    });

    it("안내 문구에 허용 범위가 들어 있다", () => {
      const result = validateRecoveryInput({ ...valid, sleepHours: 20 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.sleepHours).toContain("0~14시간");
    });
  });

  describe("잘못된 모양", () => {
    it("숫자 대신 글자나 NaN이 오면 오류이다", () => {
      expect(errorFields({ ...valid, sleepHours: "7" })).toEqual(["sleepHours"]);
      expect(errorFields({ ...valid, soreness: Number.NaN })).toEqual(["soreness"]);
      expect(errorFields(withWorkout({ minutes: "60" }))).toEqual(["yesterdayWorkouts.cardio.minutes"]);
    });

    it("시간이나 힘든 정도가 null이면 없는 것으로 본다", () => {
      expect(errorFields(withWorkout({ minutes: null }))).toEqual(["yesterdayWorkouts.cardio.minutes"]);
    });

    it("객체가 아니면 전체 형식 오류이다", () => {
      for (const raw of [null, undefined, 42, "text", [1, 2, 3]]) {
        expect(errorFields(raw)).toEqual(["_form"]);
      }
    });

    it("여러 칸이 틀리면 모두 한 번에 알려 준다", () => {
      expect(errorFields({ ...withWorkout({ effort: 0 }), sleepHours: 30, soreness: 9 })).toEqual([
        "sleepHours",
        "soreness",
        "yesterdayWorkouts.cardio.effort",
      ]);
    });

    it("받은 값에 없는 키는 결과에 넣지 않는다", () => {
      const result = validateRecoveryInput({ ...valid, admin: true, yesterdayWorkouts: [{ ...cardio, note: "x" }] });
      expect(result).toEqual({ ok: true, data: valid });
    });
  });
});
