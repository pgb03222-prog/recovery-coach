// OpenAI 요청 함수(openai.ts)가 키와 모델, 요청 설정을 규칙대로 쓰는지 가짜 연결로 확인한다. 실제 OpenAI는 부르지 않는다.

import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL, createOpenAiAsk } from "./openai";

/** responses.create를 흉내 내는 가짜 연결 */
function fakeClient(outputText = "안녕") {
  const create = vi.fn(async () => ({ output_text: outputText }));
  // 시험에서는 필요한 부분만 흉내 낸다.
  return { client: { responses: { create } } as never, create };
}

describe("createOpenAiAsk", () => {
  it("키가 없거나 비어 있으면 undefined를 돌려준다 (그러면 설명은 규칙 기본 문장이 된다)", () => {
    expect(createOpenAiAsk({})).toBeUndefined();
    expect(createOpenAiAsk({ OPENAI_API_KEY: "" })).toBeUndefined();
    expect(createOpenAiAsk({ OPENAI_API_KEY: "   " })).toBeUndefined();
  });

  it("키가 있으면 요청 함수를 만들고, 그 키로 연결한다", () => {
    const { client } = fakeClient();
    const factory = vi.fn(() => client);
    expect(createOpenAiAsk({ OPENAI_API_KEY: " 가짜키 " }, factory)).toBeTypeOf("function");
    expect(factory).toHaveBeenCalledWith("가짜키");
  });

  it("기본 모델로 요청하고, 지시문과 입력을 그대로 넘기며, 요청 내용을 저장하지 않게 한다", async () => {
    const { client, create } = fakeClient("응답 문장");
    const ask = createOpenAiAsk({ OPENAI_API_KEY: "가짜키" }, () => client);

    expect(await ask!({ instructions: "지시문", input: "입력" })).toBe("응답 문장");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      model: DEFAULT_MODEL,
      instructions: "지시문",
      input: "입력",
      reasoning: { effort: "low" },
      max_output_tokens: 400,
      store: false,
    });
  });

  it("OPENAI_MODEL이 있으면 그 모델을 쓴다", async () => {
    const { client, create } = fakeClient();
    const ask = createOpenAiAsk({ OPENAI_API_KEY: "가짜키", OPENAI_MODEL: " 다른-모델 " }, () => client);
    await ask!({ instructions: "지시문", input: "입력" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "다른-모델" }));
  });

  it("연결이 오류를 던지면 그대로 던진다 (explainResult가 받아서 기본 문장으로 바꾼다)", async () => {
    const create = vi.fn(async () => {
      throw new TypeError("network");
    });
    const ask = createOpenAiAsk({ OPENAI_API_KEY: "가짜키" }, () => ({ responses: { create } }) as never);
    await expect(ask!({ instructions: "지시문", input: "입력" })).rejects.toThrow(TypeError);
  });

  it("기본 모델 이름이 비어 있지 않다", () => {
    expect(DEFAULT_MODEL).toMatch(/^gpt-/);
  });
});
