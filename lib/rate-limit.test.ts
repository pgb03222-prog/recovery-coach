// 호출 횟수 제한(rate-limit.ts)이 한도, 시간 경과, 주소 구분대로 동작하는지 확인한다.

import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, checkRateLimit, getClientKey, resetRateLimit } from "./rate-limit";

beforeEach(() => resetRateLimit());

describe("checkRateLimit", () => {
  it("한도까지는 허용하고 그다음부터 막는다", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) expect(checkRateLimit("a", 1000 + i).allowed).toBe(true);
    const blocked = checkRateLimit("a", 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("막힌 호출은 횟수에 더해지지 않아, 창 시간이 지나면 다시 허용된다", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("a", 0);
    for (let i = 0; i < 50; i++) expect(checkRateLimit("a", 1000).allowed).toBe(false);
    expect(checkRateLimit("a", RATE_LIMIT_WINDOW_MS).allowed).toBe(true);
  });

  it("주소마다 따로 센다", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("a", 0);
    expect(checkRateLimit("a", 1).allowed).toBe(false);
    expect(checkRateLimit("b", 1).allowed).toBe(true);
  });

  it("다시 시도할 수 있는 시간을 초 단위로 알려 준다", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("a", 0);
    expect(checkRateLimit("a", 10_000).retryAfterSeconds).toBe(50);
  });

  it("한도와 창 시간을 바꿔 쓸 수 있다", () => {
    expect(checkRateLimit("a", 0, 1, 1000).allowed).toBe(true);
    expect(checkRateLimit("a", 500, 1, 1000).allowed).toBe(false);
    expect(checkRateLimit("a", 1000, 1, 1000).allowed).toBe(true);
  });
});

describe("getClientKey", () => {
  const withHeaders = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

  it("x-forwarded-for의 첫 주소를 쓴다", () => {
    expect(getClientKey(withHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("없으면 x-real-ip, 그것도 없으면 unknown이다", () => {
    expect(getClientKey(withHeaders({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(getClientKey(withHeaders({}))).toBe("unknown");
  });
});
