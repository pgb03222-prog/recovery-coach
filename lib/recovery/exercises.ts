// Design Ref: §4.3 운동 종류 고르기 — 강도에 맞는 운동 후보에서 1~3개를 고르고 한 줄 이유를 붙인다.
// 운동 이름과 이유 문장은 AI가 아니라 여기에 미리 정해 둔다. 그래서 같은 입력이면 항상 같은 추천이 나온다.
// Plan SC: 추천은 1~3개, 각각 한 줄 이유 포함. 어제 힘든 정도 8 이상이면 높음일 때 어제와 같은 종류는 뺀다.

import { HARD_YESTERDAY_EFFORT_AT_LEAST, MAX_RECOMMENDATIONS } from "./constants";
import type { Intensity, Recommendation, RecoveryInput } from "./types";

/**
 * 강도별 운동 후보. 각 강도의 후보는 앞에서부터 순서대로 고른다.
 * (후보 목록은 설계의 초안이며, 운동을 바꾸거나 더하려면 이 표만 고치면 된다.)
 */
export const EXERCISE_CANDIDATES: Readonly<Record<Intensity, readonly Recommendation[]>> = {
  rest: [
    { name: "충분히 쉬기", category: "rest", reason: "오늘은 몸이 회복할 시간을 주는 것이 가장 좋아요" },
    { name: "가벼운 걷기 20분", category: "cardio", reason: "피로가 남아 있어도 부담 없이 몸을 풀 수 있어요" },
    { name: "스트레칭", category: "yoga", reason: "뭉친 근육을 천천히 풀어 회복을 도와요" },
  ],
  light: [
    { name: "가벼운 걷기 30분", category: "cardio", reason: "숨이 차지 않는 정도로 움직이면 회복에 도움이 돼요" },
    { name: "요가·스트레칭 20분", category: "yoga", reason: "근육의 긴장을 풀고 유연성을 챙길 수 있어요" },
    { name: "가벼운 맨몸 근력 운동", category: "strength", reason: "몸에 큰 부담 없이 근육을 깨울 수 있어요" },
  ],
  moderate: [
    { name: "가벼운 조깅이나 자전거", category: "cardio", reason: "컨디션이 괜찮아서 적당히 심박을 올려도 좋아요" },
    { name: "보통 무게 전신 근력 운동", category: "strength", reason: "무리하지 않는 무게로 전신을 고르게 쓸 수 있어요" },
    { name: "가벼운 구기 운동", category: "sports", reason: "즐겁게 움직이면서 적당한 운동량을 채울 수 있어요" },
  ],
  high: [
    { name: "인터벌 달리기", category: "cardio", reason: "컨디션이 좋아서 강하게 몰아붙여도 괜찮아요" },
    { name: "고중량 근력 운동", category: "strength", reason: "몸 상태가 좋아 높은 무게에 도전하기 좋아요" },
    { name: "경기 형태 구기 운동", category: "sports", reason: "회복이 잘 돼서 경기처럼 강하게 움직여도 좋아요" },
  ],
};

/**
 * 오늘의 강도에 맞는 운동을 1~3개 고른다.
 * 1. 해당 강도의 후보를 앞에서부터 본다.
 * 2. 어제 힘든 정도가 8 이상이고 오늘 강도가 "높음"이면, 어제와 같은 종류의 후보는 건너뛴다.
 *    ("기타"를 골랐거나 어제 운동을 쉬었으면 건너뛰는 후보가 없다.)
 * 3. 남은 후보에서 최대 3개를 고른다. 각 항목에는 미리 정해 둔 한 줄 이유가 붙어 있다.
 *
 * 입력은 validateRecoveryInput을 통과한 값이어야 한다. 어제 운동을 했는데 힘든 정도가 없으면 RangeError를 던진다.
 */
export function recommendExercises(input: RecoveryInput, intensity: Intensity): Recommendation[] {
  let hardYesterday = false;
  if (input.yesterdayType !== "none") {
    if (input.yesterdayEffort === undefined) throw new RangeError("어제 힘든 정도가 없습니다.");
    hardYesterday = input.yesterdayEffort >= HARD_YESTERDAY_EFFORT_AT_LEAST;
  }

  const skipSameCategory = intensity === "high" && hardYesterday;

  return EXERCISE_CANDIDATES[intensity]
    .filter((candidate) => !(skipSameCategory && candidate.category === input.yesterdayType))
    .slice(0, MAX_RECOMMENDATIONS)
    .map((candidate) => ({ ...candidate })); // 돌려받은 쪽에서 고쳐도 후보 표가 바뀌지 않게 복사한다.
}
