// 보안 점검 1번 — 같은 사람이 짧은 시간에 너무 많이 부르면 막아서 OpenAI 요금 남용을 줄인다.
// 서버 메모리에 접속 주소별 호출 시각만 잠깐 담는다. 입력값은 담지 않고, 시간이 지나면 지운다. (PRD §7: 저장하지 않는다)
// 한계: 서버가 여러 대로 나뉘거나 다시 켜지면 횟수가 초기화된다. 완전한 방어는 OpenAI 월 사용 한도와 함께 쓴다.

/** 한 주소가 창 시간 안에 부를 수 있는 최대 횟수 */
export const RATE_LIMIT_MAX = 10;
/** 창 시간(밀리초): 1분 */
export const RATE_LIMIT_WINDOW_MS = 60_000;
/** 메모리를 지키려고 담아 두는 주소 수의 상한. 넘으면 오래된 것부터 지운다. */
const MAX_TRACKED_KEYS = 5000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** 막혔을 때 몇 초 뒤에 다시 시도할 수 있는지 */
  retryAfterSeconds: number;
}

/** 이 주소의 호출을 센다. 한도를 넘으면 allowed가 false이다. now는 시험에서 시간을 흉내 낼 때 쓴다. */
export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimitResult {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }

  recent.push(now);
  hits.delete(key); // 가장 최근에 쓴 주소가 Map 맨 뒤로 가게 한다.
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [oldKey, times] of hits) {
      if (times.every((time) => now - time >= windowMs) || hits.size > MAX_TRACKED_KEYS) hits.delete(oldKey);
      if (hits.size <= MAX_TRACKED_KEYS) break;
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** 시험에서 기록을 비울 때 쓴다. */
export function resetRateLimit(): void {
  hits.clear();
}

/** 요청에서 접속 주소를 읽는다. Vercel이 붙여 주는 x-forwarded-for의 첫 값을 쓰고, 없으면 하나로 묶는다. */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
