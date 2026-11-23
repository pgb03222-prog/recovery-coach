// Design Ref: §4.4 점수 근거 문장 — 점수가 왜 그렇게 나왔는지 한 줄씩 설명한다.
// 문장은 AI가 아니라 규칙으로 만든다. 그래서 같은 입력이면 항상 같은 문장이 나온다.
// Plan SC: 모든 결과에 점수 근거가 한 줄 이상 표시된다. (감점이 없어도 한 줄은 나온다)

import { INPUT_LIMITS, LONG_WORKOUT_MINUTES, SCORE_CAP, SLEEP_PENALTIES } from "./constants";
import { calculateScore, getPenalties } from "./score";
import type { CapCause, Penalty } from "./score";
import type { RecoveryInput } from "./types";

/** 감점이 하나도 없을 때 보여 줄 근거 */
export const NO_PENALTY_REASON = "감점 요인이 없어요";

/** 상한 원인을 문장에 넣을 이름 */
const CAP_CAUSE_LABELS: Record<CapCause, string> = {
  soreness: "근육통",
  sleep: "수면",
};

/** 감점 하나를 "무엇 때문에 몇 점 줄었는지" 한 줄로 바꾼다. */
function describePenalty(penalty: Penalty, input: RecoveryInput): string {
  const points = `${penalty.amount}점 줄었어요`;

  switch (penalty.factor) {
    case "sleep": {
      // 해당 구간의 위쪽 기준(예: 5시간 이상 6시간 미만이면 "6시간 미만")을 표에서 찾는다.
      const index = SLEEP_PENALTIES.findIndex((rule) => input.sleepHours >= rule.minHours);
      const upperHours = SLEEP_PENALTIES[index - 1]?.minHours;
      return upperHours === undefined ? `수면이 부족해서 ${points}` : `수면이 ${upperHours}시간 미만이라 ${points}`;
    }
    case "soreness":
      return `근육통이 ${input.soreness}점이라 ${points}`;
    case "effort":
      return `어제 힘든 정도가 ${INPUT_LIMITS.yesterdayEffort.max}점 중 ${input.yesterdayEffort}점이라 ${points}`;
    case "longWorkout":
      return `어제 운동 시간이 ${input.yesterdayMinutes}분(${LONG_WORKOUT_MINUTES}분 이상)이라 ${points}`;
  }
}

/**
 * 점수 근거 문장 목록을 만든다. 항상 한 줄 이상이다.
 * 1. 감점된 항목마다 한 줄씩 (수면 → 근육통 → 힘든 정도 → 긴 운동 시간 순서)
 * 2. 감점이 하나도 없으면 "감점 요인이 없어요"
 * 3. 60점 상한 때문에 점수가 실제로 낮아졌을 때만 "근육통 때문에 점수가 60점까지만 나와요" 같은 한 줄을 마지막에 더한다.
 *
 * 입력은 validateRecoveryInput을 통과한 값이어야 한다. 아니면 RangeError를 던진다.
 */
export function buildScoreReasons(input: RecoveryInput): string[] {
  const reasons = getPenalties(input).map((penalty) => describePenalty(penalty, input));
  if (reasons.length === 0) reasons.push(NO_PENALTY_REASON);

  const { capped, capCauses } = calculateScore(input);
  if (capped) {
    const causes = capCauses.map((cause) => CAP_CAUSE_LABELS[cause]).join("·");
    reasons.push(`${causes} 때문에 점수가 ${SCORE_CAP}점까지만 나와요`);
  }

  return reasons;
}
