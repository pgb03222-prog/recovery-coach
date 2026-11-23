// Design Ref: §4 데이터 흐름 6단계, §4.3 기본 설명 문장 — 점수와 강도를 풀어 쓴 설명 문장을 만든다.
// 이 파일에는 우선 "규칙 기본 문장"만 있다. 외부 AI 설명은 PLAN 13번 작업에서 이 파일에 더하고,
// AI가 실패하거나 응답이 규칙에 어긋나면 이 기본 문장을 대신 쓴다.

import { INTENSITY_LABELS } from "../recovery/constants";
import type { Intensity } from "../recovery/types";

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
