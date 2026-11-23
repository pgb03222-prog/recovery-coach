// POST /api/recommend가 DESIGN §5의 응답 모양과 상태 코드대로 동작하는지 확인한다.

import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateRecovery } from "../../../lib/recovery/recommend";
import { POST } from "./route";

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
