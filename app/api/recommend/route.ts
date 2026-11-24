// Design Ref: §5 서버 쪽 코드(API) — POST /api/recommend
// 입력 5개를 받아 검사하고, 점수·근거·강도·추천·안내 문구를 한 번에 돌려준다.
// 입력값은 저장하지 않고 로그에도 남기지 않는다. (PRD §7 개인정보)
// 설명 문장은 외부 AI(OpenAI)에게 계산 결과만 보내 받고, 실패하면 규칙 기본 문장을 쓴다. (PLAN 13번)

import { explainResult } from "../../../lib/ai/explain";
import { createOpenAiAsk } from "../../../lib/ai/openai";
import { calculateRecovery } from "../../../lib/recovery/recommend";
import { validateRecoveryInput } from "../../../lib/recovery/validate";

/** 요청 본문 최대 크기(글자 수). 입력 5개는 100글자도 안 되므로 1KB면 충분하다. */
const MAX_BODY_LENGTH = 1024;

/** 오류 응답을 DESIGN §5의 모양 { error: { code, message, details } }으로 만든다. */
function errorResponse(status: number, code: string, message: string, details?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function POST(request: Request) {
  // 0. 형식 검사: JSON으로 보낸 요청만 받는다. (다른 사이트가 form 형식으로 몰래 보내는 요청을 막는다)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "JSON 형식으로 보내 주세요.");
  }

  // 1. 요청 본문 읽기: 너무 크면 413, JSON이 아니면 400
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_LENGTH) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "요청 내용이 너무 길어요.");
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "입력값을 확인해 주세요.", {
      _form: "요청 내용을 읽을 수 없어요. JSON 형식으로 보내 주세요.",
    });
  }

  // 2. 입력 검사: 범위를 벗어나거나 빠진 칸이 있으면 400 (칸 이름 → 안내 문구)
  const validation = validateRecoveryInput(body);
  if (!validation.ok) {
    return errorResponse(400, "VALIDATION_ERROR", "입력값을 확인해 주세요.", validation.errors);
  }

  // 3. 계산: 예상하지 못한 오류는 500으로 알리되, 입력값이 들어 있을 수 있는 오류 내용은 로그에 남기지 않는다.
  try {
    // 점수·강도·추천은 규칙으로 계산하고, 설명 문장만 AI에게 받는다. (AI가 실패하면 규칙 기본 문장이 들어간다)
    const result = calculateRecovery(validation.data);
    const explanation = await explainResult(result, createOpenAiAsk());
    return Response.json({ ...result, ...explanation });
  } catch (error) {
    console.error("recommend 처리 중 오류:", error instanceof Error ? error.name : "알 수 없는 오류");
    return errorResponse(500, "INTERNAL_ERROR", "잠시 후 다시 시도해 주세요.");
  }
}
