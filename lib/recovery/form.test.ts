// 입력 화면의 글자 값을 입력으로 바꾸는 함수(form.ts)를 확인한다.

import { describe, expect, it } from "vitest";
import { EMPTY_FORM_VALUES, parseFormValues } from "./form";
import type { FormValues } from "./form";

const valid: FormValues = {
  yesterdayType: "cardio",
  yesterdayMinutes: "60",
  yesterdayEffort: "5",
  sleepHours: "6.5",
  soreness: "3",
};

function errorFields(values: FormValues): string[] {
  const result = parseFormValues(values);
  return result.ok ? [] : Object.keys(result.errors).sort();
}

describe("parseFormValues", () => {
  it("글자로 된 값을 숫자로 바꿔 통과시킨다", () => {
    expect(parseFormValues(valid)).toEqual({
      ok: true,
      data: { yesterdayType: "cardio", yesterdayMinutes: 60, yesterdayEffort: 5, sleepHours: 6.5, soreness: 3 },
    });
  });

  it("앞뒤 공백은 지우고 읽는다", () => {
    expect(parseFormValues({ ...valid, sleepHours: " 7 ", yesterdayMinutes: "  45" }).ok).toBe(true);
  });

  it("아무것도 입력하지 않으면 종류, 수면, 근육통만 먼저 알려 준다", () => {
    // 종류를 아직 고르지 않았으면 운동 시간과 힘든 정도는 검사하지 않는다.
    expect(errorFields(EMPTY_FORM_VALUES)).toEqual(["sleepHours", "soreness", "yesterdayType"]);
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

  it("운동을 했는데 시간과 힘든 정도가 빈 칸이면 두 칸 모두 알려 준다", () => {
    expect(errorFields({ ...valid, yesterdayMinutes: "", yesterdayEffort: "" })).toEqual([
      "yesterdayEffort",
      "yesterdayMinutes",
    ]);
  });

  it("어제 운동 안 함이면 시간과 힘든 정도 칸의 값은 비어 있어도 잘못돼 있어도 무시한다", () => {
    expect(parseFormValues({ ...valid, yesterdayType: "none", yesterdayMinutes: "", yesterdayEffort: "" })).toEqual({
      ok: true,
      data: { yesterdayType: "none", sleepHours: 6.5, soreness: 3 },
    });
    expect(parseFormValues({ ...valid, yesterdayType: "none", yesterdayMinutes: "abc", yesterdayEffort: "99" }).ok).toBe(true);
  });

  it("범위와 단위 안내는 검사 함수와 같다", () => {
    expect(errorFields({ ...valid, sleepHours: "20" })).toEqual(["sleepHours"]);
    expect(errorFields({ ...valid, sleepHours: "6.3" })).toEqual(["sleepHours"]);
    expect(errorFields({ ...valid, yesterdayMinutes: "4" })).toEqual(["yesterdayMinutes"]);
    expect(errorFields({ ...valid, yesterdayEffort: "11" })).toEqual(["yesterdayEffort"]);
    expect(errorFields({ ...valid, soreness: "0" })).toEqual(["soreness"]);
  });

  it("처음 상태(EMPTY_FORM_VALUES)는 모든 칸이 빈 글자이다", () => {
    expect(Object.values(EMPTY_FORM_VALUES).every((value) => value === "")).toBe(true);
  });
});
