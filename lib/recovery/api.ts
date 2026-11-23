// Design Ref: §4 데이터 흐름, §5 서버 쪽 코드(API) — 화면이 POST /api/recommend를 부르는 함수.
// 화면 코드와 분리해 두어 서버가 어떤 응답을 주어도 화면이 깨지지 않는지 시험할 수 있게 한다.

import type { RecoveryInput, RecoveryResult } from "./types";

/** 서버 호출 결과. 실패하면 화면에 그대로 보여 줄 안내 문구가 들어 있다. */
export type RecommendationResponse =
  | { ok: true; data: RecoveryResult }
  | { ok: false; message: string };

/** 서버 오류나 연결 실패일 때 보여 줄 문구 */
export const FETCH_FAILED_MESSAGE = "결과를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 입력이 틀렸다는 응답(400)에 안내가 들어 있지 않을 때 보여 줄 문구 */
const INVALID_INPUT_MESSAGE = "입력값을 확인해 주세요.";

/** 서버가 준 값이 화면에서 쓰는 결과 모양이 맞는지 가볍게 확인한다. */
function isRecoveryResult(value: unknown): value is RecoveryResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.score === "number" &&
    Array.isArray(result.scoreReasons) &&
    Array.isArray(result.notices) &&
    typeof result.intensity === "string" &&
    Array.isArray(result.recommendations) &&
    typeof result.explanation === "string"
  );
}

/** 400 응답의 details(칸 이름 → 안내 문구)를 한 문장으로 합친다. 없으면 기본 문구를 쓴다. */
async function readValidationMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const details = (body as { error?: { details?: unknown } } | null)?.error?.details;
    if (typeof details === "object" && details !== null) {
      const messages = Object.values(details).filter((message): message is string => typeof message === "string");
      if (messages.length > 0) return messages.join(" ");
    }
  } catch {
    // 본문을 읽지 못하면 기본 문구를 쓴다.
  }
  return INVALID_INPUT_MESSAGE;
}

/**
 * 검사를 통과한 입력을 서버로 보내 결과를 받아 온다.
 * 서버가 오류를 주거나 연결이 끊겨도 오류를 던지지 않고, 화면에 보여 줄 문구를 담아 돌려준다.
 * fetcher는 시험에서 가짜 서버를 끼워 넣을 때 쓴다.
 */
export async function requestRecommendation(
  input: RecoveryInput,
  fetcher: typeof fetch = fetch,
): Promise<RecommendationResponse> {
  try {
    const response = await fetcher("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      const data: unknown = await response.json();
      return isRecoveryResult(data) ? { ok: true, data } : { ok: false, message: FETCH_FAILED_MESSAGE };
    }
    if (response.status === 400) return { ok: false, message: await readValidationMessage(response) };
    return { ok: false, message: FETCH_FAILED_MESSAGE };
  } catch {
    return { ok: false, message: FETCH_FAILED_MESSAGE };
  }
}
