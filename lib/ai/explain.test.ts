// 규칙 기본 설명 문장(explain.ts)이 DESIGN §4.3의 틀대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { buildRuleExplanation } from "./explain";

describe("buildRuleExplanation", () => {
  it("점수, 근거 첫 줄, 강도를 틀에 맞춰 이어 붙인다", () => {
    expect(buildRuleExplanation(50, ["수면이 5시간 미만이라 30점 줄었어요", "근육통이 2점이라 10점 줄었어요"], "light")).toBe(
      "오늘 회복 점수는 50점이에요. 수면이 5시간 미만이라 30점 줄었어요. 그래서 오늘은 가벼움 강도의 운동을 추천해요.",
    );
  });

  it("강도 이름이 문장에 들어간다", () => {
    expect(buildRuleExplanation(70, ["근육통이 2점이라 10점 줄었어요"], "moderate")).toContain("보통 강도의 운동");
    expect(buildRuleExplanation(90, ["감점 요인이 없어요"], "high")).toContain("높음 강도의 운동");
  });

  it("휴식이면 쉬거나 가볍게 몸을 푸는 것을 추천한다", () => {
    expect(buildRuleExplanation(20, ["수면이 6시간 미만이라 20점 줄었어요"], "rest")).toBe(
      "오늘 회복 점수는 20점이에요. 수면이 6시간 미만이라 20점 줄었어요. 그래서 오늘은 쉬거나 가볍게 몸을 푸는 것을 추천해요.",
    );
  });

  it("근거가 없어도 문장이 끊기지 않는다", () => {
    expect(buildRuleExplanation(100, [], "high")).toBe(
      "오늘 회복 점수는 100점이에요. 그래서 오늘은 높음 강도의 운동을 추천해요.",
    );
  });
});
