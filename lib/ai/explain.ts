// Design Ref: §4 데이터 흐름 6단계, §4.3 기본 설명 문장, §9 보안 — 점수와 강도를 풀어 쓴 설명 문장을 만든다.
// 1. 외부 AI에게 "계산 결과"만 보내 설명 문장을 받는다. 입력 원값 그대로의 항목은 보내지 않지만,
//    점수 근거 문장 속 근육통 점수·힘든 정도·운동 시간 숫자는 함께 나간다. (수면 시간은 "6시간 미만" 같은 구간으로만 나간다)
// 2. AI가 실패하거나 느리거나, 응답이 규칙에 어긋나면(진단·치료 표현, 점수·강도가 계산과 다름) 규칙 기본 문장을 대신 쓴다.
// 점수·강도·추천 운동은 AI가 정하지 않는다. AI는 이미 정해진 결과를 풀어 쓰기만 한다.

import { INTENSITY_LABELS, INTENSITY_ORDER, MAX_SCORE } from "../recovery/constants";
import type { ExplanationSource, Intensity, RecoveryResult } from "../recovery/types";

/** AI 응답을 기다리는 최대 시간(밀리초). 넘으면 규칙 기본 문장을 쓴다. */
export const AI_TIMEOUT_MS = 5000;

/** AI 설명 문장에 허용하는 최대 글자 수와 문장 수 */
const MAX_TEXT_LENGTH = 300;
const MAX_SENTENCES = 4;

/** AI 설명에 들어가면 안 되는 표현 (진단·치료 조언 금지, PRD §5) */
const BANNED_WORDS = ["진단", "치료", "처방", "질병", "부상입니다"];

/** 설명 문장을 만드는 데 필요한 값. 모두 규칙으로 정해진 "계산 결과"이다. */
export type ExplainInput = Pick<RecoveryResult, "score" | "scoreReasons" | "intensity" | "recommendations">;

/** AI에게 보내는 요청 */
export interface AiRequest {
  /** AI가 지킬 규칙 */
  instructions: string;
  /** 설명할 계산 결과 (JSON 글자) */
  input: string;
}

/** AI에게 요청을 보내고 설명 문장을 받아 오는 함수. 실패하면 오류를 던진다. */
export type AskAi = (request: AiRequest) => Promise<string>;

/** 설명 문장과 그 출처 */
export interface Explanation {
  explanation: string;
  explanationSource: ExplanationSource;
}

/**
 * 규칙으로 만든 기본 설명 문장.
 * 틀: "오늘 회복 점수는 {점수}점이에요. {근거 첫 줄}. 그래서 오늘은 {강도} 강도의 운동을 추천해요."
 * 강도가 휴식이면 마지막 문장을 "쉬거나 가볍게 몸을 푸는 것을 추천해요"로 바꾼다.
 */
export function buildRuleExplanation(score: number, reasons: string[], intensity: Intensity): string {
  const firstReason = reasons.find((reason) => reason.trim() !== "");
  const conclusion =
    intensity === "rest"
      ? "그래서 오늘은 쉬거나 가볍게 몸을 푸는 것을 추천해요."
      : `그래서 오늘은 ${INTENSITY_LABELS[intensity]} 강도의 운동을 추천해요.`;

  const sentences = [`오늘 회복 점수는 ${score}점이에요.`];
  if (firstReason) sentences.push(`${firstReason}.`);
  sentences.push(conclusion);
  return sentences.join(" ");
}

/** AI가 지킬 규칙. 응답은 아래 checkAiExplanation으로도 한 번 더 검사한다. */
const AI_INSTRUCTIONS = [
  "당신은 운동 회복 앱의 설명 담당입니다. 아래 규칙을 반드시 지킵니다.",
  "- 한국어로 2~3문장만 씁니다. 쉬운 말을 씁니다.",
  "- 주어진 계산 결과(회복 점수, 점수 근거, 오늘의 강도, 추천 운동)를 바꾸거나 새로 만들지 않고 풀어서 설명만 합니다.",
  "- 주어진 점수와 숫자 외의 숫자는 쓰지 않습니다.",
  "- 오늘의 강도는 주어진 이름 그대로(휴식, 가벼움, 보통, 높음 중 하나) 씁니다.",
  "- 진단, 치료, 약, 질병 이름 등 의학적 조언은 하지 않습니다.",
  "- 마지막 문장에서 오늘의 추천을 짧게 정리합니다.",
].join("\n");

/** 계산 결과를 AI에게 보낼 요청으로 만든다. 입력 원값은 넣지 않는다. */
export function buildAiRequest(input: ExplainInput): AiRequest {
  const data = {
    "회복 점수": input.score,
    "점수 근거": input.scoreReasons,
    "오늘의 강도": INTENSITY_LABELS[input.intensity],
    "추천 운동": input.recommendations.map((item) => ({ 이름: item.name, 이유: item.reason })),
  };
  return { instructions: AI_INSTRUCTIONS, input: JSON.stringify(data) };
}

/** AI 응답 검사 결과 */
export type AiCheck = { ok: true; text: string } | { ok: false; reason: string };

/**
 * AI 응답이 규칙에 맞는지 검사한다. 하나라도 어긋나면 쓰지 않는다.
 * - 비어 있거나 300자를 넘거나 4문장을 넘으면 안 된다.
 * - 진단·치료 같은 금지 표현이 있으면 안 된다.
 * - "N점"에 쓰인 숫자는 계산 결과(점수, 근거에 나온 숫자)와 같아야 한다.
 * - "높음 강도", "강도는 보통"처럼 강도를 말할 때는 오늘의 강도와 같아야 한다.
 */
export function checkAiExplanation(rawText: unknown, input: ExplainInput): AiCheck {
  if (typeof rawText !== "string") return { ok: false, reason: "응답이 글자가 아님" };
  const text = rawText.trim();
  if (text === "") return { ok: false, reason: "빈 응답" };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, reason: "너무 긴 응답" };

  const sentenceCount = text.split(/[.!?。]+/).filter((sentence) => sentence.trim() !== "").length;
  if (sentenceCount > MAX_SENTENCES) return { ok: false, reason: "문장이 너무 많음" };

  const banned = BANNED_WORDS.find((word) => text.includes(word));
  if (banned) return { ok: false, reason: "금지 표현 포함" };

  // 점수로 말한 숫자는 계산 결과에 나온 숫자(점수, 만점, 근거 문장 속 숫자)여야 한다.
  const allowedNumbers = new Set<number>([input.score, MAX_SCORE]);
  for (const match of input.scoreReasons.join(" ").matchAll(/\d+/g)) allowedNumbers.add(Number(match[0]));
  // 링크(주소)는 설명 문장에 필요 없으므로 쓰지 않는다.
  if (/https?:|www\.|:\/\//i.test(text)) return { ok: false, reason: "링크 포함" };

  // 분·시간으로 말한 숫자도 계산 결과(근거 문장, 추천 운동 이름·이유)에 나온 숫자여야 한다.
  const allowedDurations = new Set<number>();
  const source = [...input.scoreReasons, ...input.recommendations.flatMap((item) => [item.name, item.reason])].join(" ");
  for (const match of source.matchAll(/\d+/g)) allowedDurations.add(Number(match[0]));
  for (const match of text.matchAll(/(\d+)\s*(?:분|시간)/g)) {
    if (!allowedDurations.has(Number(match[1]))) return { ok: false, reason: "계산 결과에 없는 시간" };
  }

  for (const match of text.matchAll(/(\d+)\s*점/g)) {
    if (!allowedNumbers.has(Number(match[1]))) return { ok: false, reason: "계산 결과에 없는 점수" };
  }

  // 강도를 말하는 표현은 오늘의 강도와 같아야 한다.
  const todayLabel = INTENSITY_LABELS[input.intensity];
  const labels = INTENSITY_ORDER.map((step) => INTENSITY_LABELS[step]).join("|");
  const intensityMentions = [
    ...text.matchAll(new RegExp(`(${labels})\\s*강도`, "g")),
    ...text.matchAll(new RegExp(`강도\\s*(?:는|가|를|은|도|로)?\\s*[:：]?\\s*["“'‘]?(${labels})`, "g")),
  ];
  if (intensityMentions.some((match) => match[1] !== todayLabel)) {
    return { ok: false, reason: "계산 결과와 다른 강도" };
  }

  return { ok: true, text };
}

/** 정해진 시간 안에 끝나지 않으면 오류를 던진다. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("AI 응답 시간 초과"), { name: "TimeoutError" })), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * 설명 문장을 만든다. 절대 오류를 던지지 않는다.
 * - ask가 있으면 AI에게 받아 검사하고, 통과하면 "ai" 문장을 쓴다.
 * - ask가 없거나(키 없음) 실패·시간 초과·검사 불통과면 규칙 기본 문장("rule")을 쓴다.
 * 로그에는 오류 이름과 이유 분류만 남기고, 입력값이나 AI 응답 내용은 남기지 않는다.
 */
export async function explainResult(
  input: ExplainInput,
  ask?: AskAi,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<Explanation> {
  const fallback: Explanation = {
    explanation: buildRuleExplanation(input.score, input.scoreReasons, input.intensity),
    explanationSource: "rule",
  };
  if (!ask) return fallback;

  try {
    const answer = await withTimeout(ask(buildAiRequest(input)), timeoutMs);
    const checked = checkAiExplanation(answer, input);
    if (checked.ok) return { explanation: checked.text, explanationSource: "ai" };
    console.warn("AI 설명을 쓰지 않고 기본 문장으로 대신했어요:", checked.reason);
    return fallback;
  } catch (error) {
    console.error("AI 설명 요청 실패:", error instanceof Error ? error.name : "알 수 없는 오류");
    return fallback;
  }
}
