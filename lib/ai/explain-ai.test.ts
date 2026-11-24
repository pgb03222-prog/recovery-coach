// AI 설명(explain.ts의 AI 부분)이 DESIGN §4.3, §9대로 동작하는지 가짜 AI로 확인한다. 실제 AI는 부르지 않는다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAiRequest, buildRuleExplanation, checkAiExplanation, explainResult } from "./explain";
import type { AskAi, ExplainInput } from "./explain";

/** 수면 4.5시간, 근육통 2, 어제 유산소 60분 힘든 5 → 50점, 가벼움 */
const input: ExplainInput = {
  score: 50,
  scoreReasons: [
    "수면이 5시간 미만이라 30점 줄었어요",
    "근육통이 2점이라 10점 줄었어요",
    "어제 힘든 정도가 10점 중 5점이라 10점 줄었어요",
  ],
  intensity: "light",
  recommendations: [
    { name: "가벼운 걷기 30분", category: "cardio", reason: "숨이 차지 않는 정도로 움직이면 회복에 도움이 돼요" },
    { name: "요가·스트레칭 20분", category: "yoga", reason: "근육의 긴장을 풀고 유연성을 챙길 수 있어요" },
  ],
};

const GOOD_TEXT =
  "오늘 회복 점수는 50점이에요. 수면이 5시간 미만이라 30점이 줄어든 것이 가장 컸어요. 그래서 가벼움 강도로 가벼운 걷기 30분 같은 운동을 추천해요.";

/** 정해 둔 글자를 돌려주는 가짜 AI */
const answering = (text: unknown): AskAi => vi.fn(async () => text as string);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildAiRequest - AI에게 보내는 내용", () => {
  it("계산 결과만 담고 입력 원값은 담지 않는다", () => {
    const request = buildAiRequest(input);
    const data = JSON.parse(request.input);
    expect(data).toEqual({
      "회복 점수": 50,
      "점수 근거": input.scoreReasons,
      "오늘의 강도": "가벼움",
      "추천 운동": [
        { 이름: "가벼운 걷기 30분", 이유: "숨이 차지 않는 정도로 움직이면 회복에 도움이 돼요" },
        { 이름: "요가·스트레칭 20분", 이유: "근육의 긴장을 풀고 유연성을 챙길 수 있어요" },
      ],
    });
    const text = request.instructions + request.input;
    for (const rawKey of ["sleepHours", "soreness", "yesterdayMinutes", "yesterdayEffort", "yesterdayType", "category"]) {
      expect(text).not.toContain(rawKey);
    }
  });

  it("지시문에 지켜야 할 규칙이 들어 있다", () => {
    const { instructions } = buildAiRequest(input);
    expect(instructions).toContain("2~3문장");
    expect(instructions).toContain("바꾸거나 새로 만들지 않고");
    expect(instructions).toContain("진단, 치료");
  });
});

describe("checkAiExplanation - 응답 검사", () => {
  it("규칙에 맞는 응답은 통과한다 (앞뒤 공백은 지운다)", () => {
    expect(checkAiExplanation(`  ${GOOD_TEXT}\n`, input)).toEqual({ ok: true, text: GOOD_TEXT });
  });

  it("실제 AI가 쓴 것과 비슷한 문장도 통과한다", () => {
    const text =
      "오늘 회복점수는 50점으로, 수면이 5시간 미만이라 30점, 근육통 2점이라 10점이 줄어든 결과예요. 오늘의 강도는 가벼움으로 표시됐고, 추천운동은 가벼운 걷기 30분과 요가·스트레칭 20분이에요.";
    expect(checkAiExplanation(text, input).ok).toBe(true);
  });

  it.each([
    ["빈 응답", ""],
    ["공백뿐인 응답", "   "],
    ["글자가 아닌 응답", undefined],
    ["글자가 아닌 응답(숫자)", 42],
  ])("%s은 쓰지 않는다", (_name, text) => {
    expect(checkAiExplanation(text, input).ok).toBe(false);
  });

  it("300자를 넘으면 쓰지 않는다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. " + "좋아요".repeat(100), input).ok).toBe(false);
  });

  it("5문장 이상이면 쓰지 않는다", () => {
    expect(checkAiExplanation("하나예요. 둘이에요. 셋이에요. 넷이에요. 다섯이에요.", input).ok).toBe(false);
    expect(checkAiExplanation("하나예요. 둘이에요. 셋이에요. 넷이에요.", input).ok).toBe(true);
  });

  it.each([
    "오늘 회복 점수는 50점이에요. 근육 부상입니다. 쉬세요.",
    "오늘 회복 점수는 50점이에요. 피로 진단 결과 가벼운 운동이 좋아요.",
    "오늘 회복 점수는 50점이에요. 치료를 위해 가볍게 움직이세요.",
    "오늘 회복 점수는 50점이에요. 약을 처방받으세요.",
  ])("진단·치료 표현이 있으면 쓰지 않는다: %s", (text) => {
    const result = checkAiExplanation(text, input);
    expect(result).toEqual({ ok: false, reason: "금지 표현 포함" });
  });

  it("계산 결과에 없는 점수를 말하면 쓰지 않는다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 90점이에요. 가벼움 강도를 추천해요.", input)).toEqual({
      ok: false,
      reason: "계산 결과에 없는 점수",
    });
  });

  it("근거에 나온 점수와 만점은 말해도 된다", () => {
    expect(checkAiExplanation("100점 만점에 50점이고, 수면 때문에 30점이 줄었어요. 가벼움 강도예요.", input).ok).toBe(true);
  });

  it.each([
    "오늘 회복 점수는 50점이에요. 오늘은 높음 강도의 운동을 추천해요.",
    "오늘 회복 점수는 50점이에요. 오늘의 강도는 보통이에요.",
    "오늘 회복 점수는 50점이에요. 강도: 높음으로 추천해요.",
    "오늘 회복 점수는 50점이에요. 휴식 강도로 쉬세요.",
  ])("오늘의 강도(가벼움)와 다른 강도를 말하면 쓰지 않는다: %s", (text) => {
    expect(checkAiExplanation(text, input)).toEqual({ ok: false, reason: "계산 결과와 다른 강도" });
  });

  it.each([
    "오늘 회복 점수는 50점이에요. 자세한 내용은 https://example.com 에서 보세요.",
    "오늘 회복 점수는 50점이에요. www.example.com 을 참고하세요.",
  ])("링크가 있으면 쓰지 않는다: %s", (text) => {
    expect(checkAiExplanation(text, input)).toEqual({ ok: false, reason: "링크 포함" });
  });

  it("계산 결과에 없는 시간(분·시간)을 말하면 쓰지 않는다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. 가벼움 강도로 90분 달리세요.", input)).toEqual({
      ok: false,
      reason: "계산 결과에 없는 시간",
    });
  });

  it("추천 이름이나 근거에 나온 시간(분·시간)은 말해도 된다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. 가벼운 걷기 30분과 요가 20분을 추천해요.", input).ok).toBe(true);
  });

  it("강도가 아닌 곳에 '휴식'이나 '보통' 같은 낱말이 나와도 쓴다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. 충분한 휴식도 챙기고, 보통 무게 운동은 내일로 미뤄요.", input).ok).toBe(true);
  });

  it("오늘의 강도를 맞게 말하면 쓴다", () => {
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. 가벼움 강도의 운동을 추천해요.", input).ok).toBe(true);
    expect(checkAiExplanation("오늘 회복 점수는 50점이에요. 오늘의 강도는 가벼움이에요.", input).ok).toBe(true);
  });
});

describe("explainResult - AI 설명과 기본 문장", () => {
  const ruleText = buildRuleExplanation(input.score, input.scoreReasons, input.intensity);

  it("AI 응답이 규칙에 맞으면 AI 문장을 쓴다", async () => {
    const ask = answering(GOOD_TEXT);
    expect(await explainResult(input, ask)).toEqual({ explanation: GOOD_TEXT, explanationSource: "ai" });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("AI에게는 계산 결과만 담은 요청을 보낸다", async () => {
    const ask = answering(GOOD_TEXT);
    await explainResult(input, ask);
    const request = vi.mocked(ask).mock.calls[0][0];
    expect(request).toEqual(buildAiRequest(input));
  });

  it("AI가 없으면(키 없음) 규칙 기본 문장을 쓴다", async () => {
    expect(await explainResult(input, undefined)).toEqual({ explanation: ruleText, explanationSource: "rule" });
  });

  it("AI가 오류를 던지면 규칙 기본 문장을 쓰고, 오류를 밖으로 던지지 않는다", async () => {
    const failing: AskAi = async () => {
      throw new Error("비밀 입력값 4242");
    };
    expect(await explainResult(input, failing)).toEqual({ explanation: ruleText, explanationSource: "rule" });
  });

  it("로그에는 오류 이름만 남기고 오류 내용은 남기지 않는다", async () => {
    const failing: AskAi = async () => {
      throw new RangeError("비밀 입력값 4242");
    };
    await explainResult(input, failing);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("RangeError");
    expect(logged).not.toContain("4242");
  });

  it.each([
    ["빈 응답", ""],
    ["진단 표현", "오늘 회복 점수는 50점이에요. 피로 진단 결과 쉬세요."],
    ["다른 점수", "오늘 회복 점수는 80점이에요. 가벼움 강도예요."],
    ["다른 강도", "오늘 회복 점수는 50점이에요. 높음 강도를 추천해요."],
  ])("AI 응답이 규칙에 어긋나면(%s) 규칙 기본 문장을 쓴다", async (_name, text) => {
    expect(await explainResult(input, answering(text))).toEqual({ explanation: ruleText, explanationSource: "rule" });
  });

  it("로그에는 AI 응답 내용을 남기지 않는다", async () => {
    await explainResult(input, answering("오늘 회복 점수는 50점이에요. 피로 진단 결과 쉬세요."));
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("피로");
  });

  it("AI가 정해진 시간 안에 답하지 않으면 기다리지 않고 규칙 기본 문장을 쓴다", async () => {
    const hanging: AskAi = () => new Promise<string>(() => {});
    const started = Date.now();
    expect(await explainResult(input, hanging, 30)).toEqual({ explanation: ruleText, explanationSource: "rule" });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
