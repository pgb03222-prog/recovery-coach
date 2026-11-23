// 화면이 서버를 부르는 함수(api.ts)가 어떤 응답에도 깨지지 않고 안내 문구를 돌려주는지 확인한다.

import { describe, expect, it, vi } from "vitest";
import { FETCH_FAILED_MESSAGE, requestRecommendation } from "./api";
import { calculateRecovery } from "./recommend";
import type { RecoveryInput } from "./types";

const input: RecoveryInput = { yesterdayType: "none", sleepHours: 8, soreness: 1 };

/** 정해 둔 응답을 돌려주는 가짜 fetch */
function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
}

describe("requestRecommendation", () => {
  it("서버에 POST /api/recommend로 입력을 JSON으로 보낸다", async () => {
    const fetcher = fakeFetch(calculateRecovery(input));
    await requestRecommendation(input, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/recommend");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual(input);
  });

  it("정상 응답이면 결과를 그대로 돌려준다", async () => {
    const result = calculateRecovery(input);
    expect(await requestRecommendation(input, fakeFetch(result))).toEqual({ ok: true, data: result });
  });

  it("400이면 서버가 알려 준 안내 문구를 돌려준다", async () => {
    const body = { error: { code: "VALIDATION_ERROR", message: "입력값을 확인해 주세요.", details: { sleepHours: "수면 시간은 0~14시간 사이로 입력해 주세요." } } };
    expect(await requestRecommendation(input, fakeFetch(body, 400))).toEqual({
      ok: false,
      message: "수면 시간은 0~14시간 사이로 입력해 주세요.",
    });
  });

  it("400인데 안내가 없거나 본문이 깨져 있으면 기본 안내를 돌려준다", async () => {
    expect(await requestRecommendation(input, fakeFetch({ error: {} }, 400))).toEqual({ ok: false, message: "입력값을 확인해 주세요." });
    expect(await requestRecommendation(input, fakeFetch("깨진 본문", 400))).toEqual({ ok: false, message: "입력값을 확인해 주세요." });
  });

  it("500 같은 서버 오류는 다시 시도해 달라는 문구를 돌려준다", async () => {
    const body = { error: { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." } };
    expect(await requestRecommendation(input, fakeFetch(body, 500))).toEqual({ ok: false, message: FETCH_FAILED_MESSAGE });
  });

  it("연결이 끊겨 fetch가 오류를 던져도 오류를 던지지 않는다", async () => {
    const broken = vi.fn(async () => {
      throw new TypeError("network down");
    });
    expect(await requestRecommendation(input, broken)).toEqual({ ok: false, message: FETCH_FAILED_MESSAGE });
  });

  it("200인데 결과 모양이 아니면 화면이 깨지지 않게 실패로 다룬다", async () => {
    expect(await requestRecommendation(input, fakeFetch({ hello: "world" }))).toEqual({ ok: false, message: FETCH_FAILED_MESSAGE });
    expect(await requestRecommendation(input, fakeFetch("JSON이 아님"))).toEqual({ ok: false, message: FETCH_FAILED_MESSAGE });
    expect(await requestRecommendation(input, fakeFetch(null))).toEqual({ ok: false, message: FETCH_FAILED_MESSAGE });
  });
});
