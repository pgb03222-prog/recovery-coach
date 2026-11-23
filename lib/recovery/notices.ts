// Design Ref: §3 화면 점검 목록, PRD §5 AI가 지킬 규칙 — 결과와 함께 보여 줄 안내 문구(상담 문구 등)를 만든다.
// 진단하는 표현은 쓰지 않고, 전문가 상담을 권하는 문구만 쓴다.

import type { RecoveryInput } from "./types";

/** 모든 결과에 항상 보여 주는 상담 문구 */
export const CONSULT_NOTICE = "통증이 계속되면 전문가와 상담하세요";

/** 근육통이 5점일 때 추가로 보여 주는 안내 문구 */
export const SEVERE_SORENESS_NOTICE = "통증이 심하면 운동을 쉬고 전문가와 상의하세요";

/** 근육통이 이 값이면 추가 안내를 보여 준다. */
const SEVERE_SORENESS = 5;

/** 안내 문구 목록. 상담 문구는 항상 들어 있고, 근육통 5점이면 추가 안내가 뒤에 붙는다. */
export function buildNotices(input: RecoveryInput): string[] {
  const notices = [CONSULT_NOTICE];
  if (input.soreness === SEVERE_SORENESS) notices.push(SEVERE_SORENESS_NOTICE);
  return notices;
}
