// POST /api/recommend가 DESIGN §5의 응답 모양과 상태 코드대로 동작하는지 확인한다.

import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAiAsk } from "../../../lib/ai/openai";
import type { AskAi } from "../../../lib/ai/explain";
import { calculateRecovery } from "../../../lib/recovery/recommend";
import { POST } from "./route";

// 시험에서는 실제 OpenAI를 부르지 않는다. 평소에는 AI가 없는(키 없음) 상태로 두고, 필요한 시험에서만 가짜 AI를 끼운다.
vi.mock("../../../lib/ai/openai", () => ({ createOpenAiAsk: vi.fn(() => undefined) }));

// 500 오류를 확인하려고 계산 함수만 바꿔 끼울 수 있게 감싼다. 평소에는 진짜 함수를 그대로 쓴다.
vi.mock("../../../lib/recovery/recommend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/recovery/recommend")>();
  return { ...actual, calculateRecovery: vi.fn(actual.calculateRecovery) };
});

const ENDPOINT = "http://localhost:3000/api/recommend";

/** JSON 본문으로 POST 요청을 만든다. */
function post(body: unknown) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const valid = { yesterdayType: "cardio", yesterdayMinutes: 60, yesterdayEffort: 5, sleepHours: 4.5, soreness: 2 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/recommend - 정상", () => {
  it("200과 결과 전체를 돌려준다", async () => {
    const response = await POST(post(valid));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      score: 50,
      intensity: "light",
      explanationSource: "rule",
    });
    expect(body.scoreReasons).toHaveLength(3);
    expect(body.recommendations).toHaveLength(3);
    expect(body.notices).toEqual(["통증이 계속되면 전문가와 상담하세요"]);
    expect(typeof body.explanation).toBe("string");
  });

  it("어제 운동 안 함이면 시간과 힘든 정도 없이도 200이다", async () => {
    const response = await POST(post({ yesterdayType: "none", sleepHours: 8, soreness: 1 }));
    expect(response.status).toBe(200);
    expect((await response.json()).score).toBe(100);
  });

  it("어제 운동 안 함이면 함께 온 시간과 힘든 정도는 무시한다", async () => {
    const response = await POST(
      post({ yesterdayType: "none", yesterdayMinutes: 9999, yesterdayEffort: "아주", sleepHours: 8, soreness: 1 }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).score).toBe(100);
  });

  it("같은 요청이면 같은 응답이다", async () => {
    const first = await (await POST(post(valid))).json();
    const second = await (await POST(post(valid))).json();
    expect(first).toEqual(second);
  });
});

describe("POST /api/recommend - AI 설명", () => {
  /** valid 입력(50점, 가벼움)에 맞는 AI 설명 */
  const GOOD_AI_TEXT =
    "오늘 회복 점수는 50점이에요. 수면이 5시간 미만이라 30점이 줄어든 것이 가장 컸어요. 그래서 가벼움 강도로 가벼운 걷기 30분 같은 운동을 추천해요.";

  it("AI가 규칙에 맞는 설명을 주면 설명만 AI 문장이 되고, 점수·강도·추천은 그대로이다", async () => {
    const ruleBody = await (await POST(post(valid))).json();
    vi.mocked(createOpenAiAsk).mockReturnValueOnce(async () => GOOD_AI_TEXT);

    const body = await (await POST(post(valid))).json();
    expect(body.explanationSource).toBe("ai");
    expect(body.explanation).toBe(GOOD_AI_TEXT);
    expect({ ...body, explanation: undefined, explanationSource: undefined }).toEqual({
      ...ruleBody,
      explanation: undefined,
      explanationSource: undefined,
    });
  });

  it("AI에게는 계산 결과만 보내고 입력 원값은 보내지 않는다", async () => {
    const ask = vi.fn<AskAi>(async () => GOOD_AI_TEXT);
    vi.mocked(createOpenAiAsk).mockReturnValueOnce(ask);

    await POST(post(valid));
    expect(ask).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify(ask.mock.calls[0][0]);
    expect(sent).toContain("회복 점수");
    for (const rawKey of ["sleepHours", "soreness", "yesterdayMinutes", "yesterdayEffort", "yesterdayType"]) {
      expect(sent).not.toContain(rawKey);
    }
  });

  it("AI가 실패해도 200이고 규칙 기본 문장이 들어간다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createOpenAiAsk).mockReturnValueOnce(async () => {
      throw new Error("AI 서비스 오류");
    });

    const response = await POST(post(valid));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.explanationSource).toBe("rule");
    expect(body.explanation).toContain("오늘 회복 점수는 50점이에요.");
  });

  it("AI가 규칙에 어긋나는 설명(진단 표현)을 주면 규칙 기본 문장으로 바꾼다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(createOpenAiAsk).mockReturnValueOnce(async () => "오늘 회복 점수는 50점이에요. 피로 진단 결과 쉬세요.");

    const body = await (await POST(post(valid))).json();
    expect(body.explanationSource).toBe("rule");
    expect(body.explanation).not.toContain("진단");
  });

  it("입력이 틀렸을 때는 AI를 부르지 않는다", async () => {
    const ask = vi.fn<AskAi>(async () => GOOD_AI_TEXT);
    vi.mocked(createOpenAiAsk).mockReturnValueOnce(ask);

    expect((await POST(post({ ...valid, sleepHours: 20 }))).status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
    vi.mocked(createOpenAiAsk).mockReset().mockReturnValue(undefined);
  });
});

describe("POST /api/recommend - 400 입력 오류", () => {
  it("수면 20시간은 400이고 어느 칸이 왜 틀렸는지 알려 준다", async () => {
    const response = await POST(post({ ...valid, sleepHours: 20 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof body.error.message).toBe("string");
    expect(body.error.details.sleepHours).toContain("0~14시간");
  });

  it("운동 시간 1분은 400이다", async () => {
    const response = await POST(post({ ...valid, yesterdayMinutes: 1 }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.details).toHaveProperty("yesterdayMinutes");
  });

  it("틀린 칸이 여러 개면 모두 알려 준다", async () => {
    const response = await POST(post({ ...valid, sleepHours: 30, soreness: 9 }));
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.details).sort()).toEqual(["sleepHours", "soreness"]);
  });

  it("운동을 했는데 시간과 힘든 정도가 없으면 400이다", async () => {
    const response = await POST(post({ yesterdayType: "strength", sleepHours: 7, soreness: 2 }));
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.details).sort()).toEqual(["yesterdayEffort", "yesterdayMinutes"]);
  });

  it("JSON이 아닌 본문은 400이다", async () => {
    const response = await POST(post("이건 JSON이 아니에요"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty("_form");
  });

  it("객체가 아닌 JSON(배열, 숫자, null)도 400이다", async () => {
    for (const body of [[1, 2], 42, null]) {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect((await response.json()).error.details).toHaveProperty("_form");
    }
  });

  it("오류 응답에 입력으로 받은 값이 그대로 담기지 않는다", async () => {
    const response = await POST(post({ ...valid, sleepHours: 777 }));
    expect(JSON.stringify(await response.json())).not.toContain("777");
  });
});

describe("POST /api/recommend - 415·413 형식과 크기", () => {
  it("JSON이 아닌 형식(text/plain, form)은 415이고 AI를 부르지 않는다", async () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", ""]) {
      const request = new Request(ENDPOINT, {
        method: "POST",
        headers: type ? { "content-type": type } : {},
        body: JSON.stringify(valid),
      });
      const response = await POST(request);
      expect(response.status).toBe(415);
      expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
  });

  it("charset이 붙은 application/json은 받는다", async () => {
    const request = new Request(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "Application/JSON; charset=utf-8" },
      body: JSON.stringify(valid),
    });
    expect((await POST(request)).status).toBe(200);
  });

  it("본문이 1KB를 넘으면 413이다", async () => {
    const response = await POST(post({ ...valid, extra: "가".repeat(2000) }));
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("POST /api/recommend - 500 서버 오류", () => {
  it("계산 중 예상하지 못한 오류가 나면 500이고, 오류 내용은 응답에 담지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(calculateRecovery).mockImplementationOnce(() => {
      throw new Error("비밀 입력값 1234");
    });

    const response = await POST(post(valid));
    expect(response.status).toBe(500);
    const text = JSON.stringify(await response.json());
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("1234");
  });

  it("로그에는 오류 이름만 남기고 입력값이나 오류 내용은 남기지 않는다", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(calculateRecovery).mockImplementationOnce(() => {
      throw new RangeError("수면 시간이 범위를 벗어났습니다: 4242");
    });

    await POST(post(valid));
    expect(JSON.stringify(logged.mock.calls)).toContain("RangeError");
    expect(JSON.stringify(logged.mock.calls)).not.toContain("4242");
  });
});
