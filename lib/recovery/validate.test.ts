// 입력 검사(validate.ts)가 DESIGN §4.6의 규칙대로 동작하는지 확인한다.

import { describe, expect, it } from "vitest";
import { validateRecoveryInput } from "./validate";

/** 정상 입력의 기본값. 시험마다 필요한 칸만 바꿔서 쓴다. */
const valid = {
  yesterdayType: "cardio",
  yesterdayMinutes: 60,
  yesterdayEffort: 5,
  sleepHours: 6.5,
  soreness: 3,
};

/** 오류 칸 이름만 뽑아 본다. */
function errorFields(raw: unknown): string[] {
  const result = validateRecoveryInput(raw);
  return result.ok ? [] : Object.keys(result.errors).sort();
}

describe("validateRecoveryInput", () => {
  it("정상 입력은 그대로 통과한다", () => {
    const result = validateRecoveryInput(valid);
    expect(result).toEqual({ ok: true, data: valid });
  });

  describe("어제 운동 안 함", () => {
    it("시간과 힘든 정도 없이도 통과하고, 결과에는 넣지 않는다", () => {
      const result = validateRecoveryInput({ yesterdayType: "none", sleepHours: 8, soreness: 1 });
      expect(result).toEqual({ ok: true, data: { yesterdayType: "none", sleepHours: 8, soreness: 1 } });
    });

    it("시간과 힘든 정도가 함께 와도 잘못된 값이어도 무시한다", () => {
      const result = validateRecoveryInput({
        yesterdayType: "none",
        yesterdayMinutes: 9999,
        yesterdayEffort: "아주 힘듦",
        sleepHours: 8,
        soreness: 1,
      });
      expect(result).toEqual({ ok: true, data: { yesterdayType: "none", sleepHours: 8, soreness: 1 } });
    });
  });

  describe("운동을 했는데 빠진 칸", () => {
    it("시간과 힘든 정도가 없으면 두 칸 모두 오류이다", () => {
      expect(errorFields({ yesterdayType: "strength", sleepHours: 7, soreness: 2 })).toEqual([
        "yesterdayEffort",
        "yesterdayMinutes",
      ]);
    });

    it("null도 없는 것으로 본다", () => {
      expect(errorFields({ ...valid, yesterdayMinutes: null })).toEqual(["yesterdayMinutes"]);
    });
  });

  describe("범위와 단위", () => {
    it.each([
      ["수면 0시간", { sleepHours: 0 }, true],
      ["수면 14시간", { sleepHours: 14 }, true],
      ["수면 -0.5시간", { sleepHours: -0.5 }, false],
      ["수면 14.5시간", { sleepHours: 14.5 }, false],
      ["수면 6.3시간 (0.5 단위 아님)", { sleepHours: 6.3 }, false],
      ["운동 5분", { yesterdayMinutes: 5 }, true],
      ["운동 240분", { yesterdayMinutes: 240 }, true],
      ["운동 4분", { yesterdayMinutes: 4 }, false],
      ["운동 241분", { yesterdayMinutes: 241 }, false],
      ["운동 60.5분 (정수 아님)", { yesterdayMinutes: 60.5 }, false],
      ["힘든 정도 1", { yesterdayEffort: 1 }, true],
      ["힘든 정도 10", { yesterdayEffort: 10 }, true],
      ["힘든 정도 0", { yesterdayEffort: 0 }, false],
      ["힘든 정도 11", { yesterdayEffort: 11 }, false],
      ["힘든 정도 5.5 (정수 아님)", { yesterdayEffort: 5.5 }, false],
      ["근육통 1", { soreness: 1 }, true],
      ["근육통 5", { soreness: 5 }, true],
      ["근육통 0", { soreness: 0 }, false],
      ["근육통 6", { soreness: 6 }, false],
      ["근육통 2.5 (정수 아님)", { soreness: 2.5 }, false],
    ])("%s", (_name, change, shouldPass) => {
      expect(validateRecoveryInput({ ...valid, ...change }).ok).toBe(shouldPass);
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
    });

    it("없는 종류 값은 오류이다", () => {
      expect(errorFields({ ...valid, yesterdayType: "swim" })).toEqual(["yesterdayType"]);
    });

    it("종류가 틀리면 시간과 힘든 정도는 검사하지 않고 종류 오류만 알린다", () => {
      expect(errorFields({ yesterdayType: "swim", sleepHours: 7, soreness: 2 })).toEqual(["yesterdayType"]);
    });

    it("객체가 아니면 전체 형식 오류이다", () => {
      for (const raw of [null, undefined, 42, "text", [1, 2, 3]]) {
        expect(errorFields(raw)).toEqual(["_form"]);
      }
    });

    it("여러 칸이 틀리면 모두 한 번에 알려 준다", () => {
      expect(errorFields({ ...valid, sleepHours: 30, soreness: 9, yesterdayEffort: 0 })).toEqual([
        "sleepHours",
        "soreness",
        "yesterdayEffort",
      ]);
    });
  });
});
