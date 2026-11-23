// Design Ref: §6 기술 선택(openai), §9 보안 — OpenAI에 설명 문장을 요청하는 함수를 만든다.
// 키는 .env의 OPENAI_API_KEY에서 서버 쪽 코드로만 읽는다. NEXT_PUBLIC_ 이름을 쓰지 않고, 이 파일은 서버(API)에서만 가져다 쓴다.
// 키가 없으면 undefined를 돌려주고, 그러면 설명은 규칙 기본 문장이 된다.

import OpenAI from "openai";
import { AI_TIMEOUT_MS } from "./explain";
import type { AskAi } from "./explain";

/** 설명 문장용 기본 모델. 짧은 글 2~3문장이라 작고 빠른 모델을 쓴다. .env의 OPENAI_MODEL로 바꿀 수 있다. */
export const DEFAULT_MODEL = "gpt-5.4-mini";

/** 모델이 답할 수 있는 최대 길이(토큰). 2~3문장에 충분하다. */
const MAX_OUTPUT_TOKENS = 400;

type EnvLike = Record<string, string | undefined>;
type ClientLike = Pick<OpenAI, "responses">;

/** 실제 OpenAI 연결. 시간이 넘으면 기다리지 않고, 실패해도 다시 시도하지 않는다. (다시 시도하면 기다리는 시간이 늘어난다) */
function createClient(apiKey: string): ClientLike {
  return new OpenAI({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
}

/**
 * AI에게 설명 문장을 요청하는 함수를 만든다. 키가 없으면 undefined.
 * 요청 내용은 OpenAI 쪽에 저장하지 않도록 store를 끈다.
 * env와 clientFactory는 시험에서 가짜 값을 끼워 넣을 때 쓴다.
 */
export function createOpenAiAsk(
  env: EnvLike = process.env,
  clientFactory: (apiKey: string) => ClientLike = createClient,
): AskAi | undefined {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return undefined;

  const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const client = clientFactory(apiKey);

  return async ({ instructions, input }) => {
    const response = await client.responses.create({
      model,
      instructions,
      input,
      reasoning: { effort: "low" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
    return response.output_text;
  };
}
