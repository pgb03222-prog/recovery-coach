// Design Ref: §4 데이터 흐름 2~6단계 — 점수, 근거, 강도, 추천, 안내 문구를 한 번에 이어 붙인다.
// 검사(validateRecoveryInput)는 이 함수 앞에서 끝내야 한다. 서버(API)가 검사 후에 이 함수를 부른다.
// 아직 외부 AI를 연결하지 않았으므로 설명 문장은 항상 규칙 기본 문장이다. (PLAN 13번에서 AI를 더한다)

import { buildRuleExplanation } from "../ai/explain";
import { determineIntensity } from "./intensity";
import { buildNotices } from "./notices";
import { buildScoreReasons } from "./reasons";
import { recommendExercises } from "./exercises";
import { calculateScore } from "./score";
import type { RecoveryInput, RecoveryResult } from "./types";

/**
 * 검사를 통과한 입력으로 결과 전체를 만든다. 같은 입력이면 항상 같은 결과가 나온다.
 * 검사를 통과하지 못한 값이 오면 RangeError를 던진다.
 */
export function calculateRecovery(input: RecoveryInput): RecoveryResult {
  const { score } = calculateScore(input);
  const scoreReasons = buildScoreReasons(input);
  const { intensity } = determineIntensity(input);
  const recommendations = recommendExercises(input, intensity);
  const notices = buildNotices(input);

  return {
    score,
    scoreReasons,
    notices,
    intensity,
    recommendations,
    explanation: buildRuleExplanation(score, scoreReasons, intensity),
    explanationSource: "rule",
  };
}
