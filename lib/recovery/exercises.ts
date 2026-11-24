// Design Ref: §4.3 운동 종류 고르기 — 강도에 맞는 운동 후보에서 1~3개를 고르고 한 줄 이유를 붙인다.
// 운동 이름과 이유 문장은 AI가 아니라 여기에 미리 정해 둔다. 그래서 같은 입력이면 항상 같은 추천이 나온다.
// Plan SC: 추천은 1~3개, 각각 한 줄 이유 포함. 어제 힘든 정도 8 이상이면 높음일 때 어제와 같은 종류는 뺀다.
// 근력 운동은 어제 쓴 부위를 피해 다른 부위의 구체적인 운동 이름으로 추천한다.

import { HARD_YESTERDAY_EFFORT_AT_LEAST, MAX_RECOMMENDATIONS, STRENGTH_PARTS, STRENGTH_PART_LABELS } from "./constants";
import type { ExerciseCategory, Intensity, Recommendation, RecoveryInput, StrengthPart } from "./types";

/** 후보 표의 한 칸. 근력 칸은 "어제 쓴 부위"에 따라 이름과 이유가 정해지므로 표에는 자리만 둔다. */
type Candidate = Recommendation | { category: "strength"; strength: true };

/**
 * 강도별 운동 후보. 각 강도의 후보는 앞에서부터 순서대로 고른다.
 * (후보 목록은 설계의 초안이며, 운동을 바꾸거나 더하려면 이 표만 고치면 된다.)
 */
export const EXERCISE_CANDIDATES: Readonly<Record<Intensity, readonly Candidate[]>> = {
  rest: [
    { name: "충분히 쉬기", category: "rest", reason: "오늘은 몸이 회복할 시간을 주는 것이 가장 좋아요" },
    { name: "천천히 걷기", category: "cardio", minutes: 20, reason: "피로가 남아 있어도 부담 없이 몸을 풀 수 있어요" },
    { name: "스트레칭", category: "yoga", minutes: 10, reason: "뭉친 근육을 천천히 풀어 회복을 도와요" },
  ],
  light: [
    { name: "가벼운 걷기", category: "cardio", minutes: 30, reason: "숨이 차지 않는 정도로 움직이면 회복에 도움이 돼요" },
    { name: "요가·스트레칭", category: "yoga", minutes: 20, reason: "근육의 긴장을 풀고 유연성을 챙길 수 있어요" },
    { category: "strength", strength: true },
  ],
  moderate: [
    { name: "가벼운 조깅이나 자전거", category: "cardio", minutes: 30, reason: "컨디션이 괜찮아서 적당히 심박을 올려도 좋아요" },
    { category: "strength", strength: true },
    { name: "가벼운 구기 운동", category: "sports", minutes: 30, reason: "즐겁게 움직이면서 적당한 운동량을 채울 수 있어요" },
  ],
  high: [
    { name: "인터벌 달리기", category: "cardio", minutes: 25, reason: "컨디션이 좋아서 강하게 몰아붙여도 괜찮아요" },
    { category: "strength", strength: true },
    { name: "경기 형태 구기 운동", category: "sports", minutes: 40, reason: "회복이 잘 돼서 경기처럼 강하게 움직여도 좋아요" },
  ],
};

/** 부위별 근력 운동 이름. 휴식 강도에서는 근력을 추천하지 않으므로 light, moderate, high만 있다. */
export const STRENGTH_EXERCISES: Readonly<Record<StrengthPart, Readonly<Record<Exclude<Intensity, "rest">, string>>>> = {
  upper: { light: "가벼운 맨몸 상체 운동", moderate: "보통 무게 상체 운동", high: "고중량 상체 운동" },
  lower: { light: "가벼운 맨몸 하체 운동", moderate: "보통 무게 하체 운동", high: "고중량 하체 운동" },
  core: { light: "가벼운 코어 운동", moderate: "보통 코어 운동", high: "고강도 코어 운동" },
};

/** 부위별 참고 종목. 정해진 처방이 아니라 "이런 운동이 있다"는 예시이다. */
export const STRENGTH_DETAILS: Readonly<Record<StrengthPart, Readonly<Record<Exclude<Intensity, "rest">, readonly string[]>>>> = {
  upper: {
    light: ["벽 푸시업", "무릎 푸시업", "밴드 로우"],
    moderate: ["푸시업", "덤벨 숄더 프레스", "덤벨 로우"],
    high: ["벤치프레스", "풀업", "바벨 오버헤드 프레스"],
  },
  lower: {
    light: ["맨몸 스쿼트", "브릿지", "카프 레이즈"],
    moderate: ["고블릿 스쿼트", "런지", "힙 쓰러스트"],
    high: ["바벨 스쿼트", "루마니안 데드리프트", "불가리안 스플릿 스쿼트"],
  },
  core: {
    light: ["데드버그", "버드독", "힐 터치"],
    moderate: ["플랭크", "윗몸 일으키기", "크런치"],
    high: ["행잉 레그레이즈", "롱 플랭크", "러시안 트위스트"],
  },
};

/** 전신 근력 운동의 참고 종목. 부위마다 한두 가지씩 보여 준다. */
const FULL_BODY_DETAILS: Readonly<Record<Exclude<Intensity, "rest">, readonly string[]>> = {
  light: ["상체: 무릎 푸시업", "하체: 맨몸 스쿼트", "코어: 데드버그"],
  moderate: ["상체: 푸시업, 덤벨 로우", "하체: 스쿼트, 런지", "코어: 플랭크, 윗몸 일으키기"],
  high: ["상체: 벤치프레스, 풀업", "하체: 바벨 스쿼트, 데드리프트", "코어: 행잉 레그레이즈"],
};

/** 근력 운동의 권장 시간(분). 강도가 높을수록 길게 잡는다. */
const STRENGTH_MINUTES: Readonly<Record<Exclude<Intensity, "rest">, number>> = { light: 15, moderate: 30, high: 40 };

/** 어제 근력 운동을 하지 않았을 때 추천하는 전신 근력 운동 */
const FULL_BODY_EXERCISES: Readonly<Record<Exclude<Intensity, "rest">, string>> = {
  light: "가벼운 맨몸 전신 근력 운동",
  moderate: "보통 무게 전신 근력 운동",
  high: "고중량 근력 운동",
};

/** 오늘 근력 운동 한 줄 이유 */
const FULL_BODY_REASONS: Readonly<Record<Exclude<Intensity, "rest">, string>> = {
  light: "몸에 큰 부담 없이 근육을 깨울 수 있어요",
  moderate: "무리하지 않는 무게로 전신을 고르게 쓸 수 있어요",
  high: "몸 상태가 좋아 높은 무게에 도전하기 좋아요",
};

/** 어제 근력 운동에서 쓴 부위 (여러 번 나와도 한 번씩만) */
function usedStrengthParts(input: RecoveryInput): Set<StrengthPart> {
  const used = new Set<StrengthPart>();
  for (const workout of input.yesterdayWorkouts) {
    if (workout.type === "strength") for (const part of workout.strengthParts ?? []) used.add(part);
  }
  return used;
}

/**
 * 오늘의 근력 운동 한 가지를 정한다. 어제 쓴 부위는 쉬게 하고, 남은 부위 중 우선순위(상체 → 하체 → 코어)가 앞서는 부위를 고른다.
 * - 어제 근력 운동을 안 했으면 전신 근력 운동
 * - 상체·하체·코어를 모두 썼으면 오늘은 근력 운동을 추천하지 않는다 (null)
 */
function strengthRecommendation(input: RecoveryInput, intensity: Exclude<Intensity, "rest">): Recommendation | null {
  const used = usedStrengthParts(input);

  if (used.size === 0) {
    return {
      name: FULL_BODY_EXERCISES[intensity],
      category: "strength",
      minutes: STRENGTH_MINUTES[intensity],
      reason: FULL_BODY_REASONS[intensity],
      details: [...FULL_BODY_DETAILS[intensity]],
    };
  }

  const target = STRENGTH_PARTS.find((part) => !used.has(part));
  if (target === undefined) return null;

  const usedNames = STRENGTH_PARTS.filter((part) => used.has(part))
    .map((part) => STRENGTH_PART_LABELS[part])
    .join("·");
  return {
    name: STRENGTH_EXERCISES[target][intensity],
    category: "strength",
    minutes: STRENGTH_MINUTES[intensity],
    reason: `어제 ${usedNames} 운동을 해서 오늘은 ${STRENGTH_PART_LABELS[target]}를 쓰면 회복과 균형에 좋아요`,
    details: [...STRENGTH_DETAILS[target][intensity]],
  };
}

/**
 * 오늘의 강도에 맞는 운동을 1~3개 고른다.
 * 1. 해당 강도의 후보를 앞에서부터 본다. (근력 칸은 어제 쓴 부위를 피해 구체적인 운동으로 바꾼다)
 * 2. 어제 가장 힘든 정도가 8 이상이고 오늘 강도가 "높음"이면, 어제 힘들게 한(힘든 정도 8 이상) 종류와 같은 후보는 건너뛴다.
 *    ("기타"나 어제 쉰 경우에는 건너뛰는 후보가 없다.)
 * 3. 남은 후보에서 최대 3개를 고른다. 각 항목에는 미리 정해 둔 한 줄 이유가 붙어 있다.
 *
 * 입력은 validateRecoveryInput을 통과한 값이어야 한다.
 */
export function recommendExercises(input: RecoveryInput, intensity: Intensity): Recommendation[] {
  // 오늘 강도가 "높음"일 때 건너뛸 종류: 어제 힘든 정도가 8 이상이었던 운동의 종류
  const skippedCategories = new Set<ExerciseCategory>();
  if (intensity === "high") {
    for (const workout of input.yesterdayWorkouts) {
      if (workout.effort >= HARD_YESTERDAY_EFFORT_AT_LEAST && workout.type !== "other") skippedCategories.add(workout.type);
    }
  }

  const picked: Recommendation[] = [];
  for (const candidate of EXERCISE_CANDIDATES[intensity]) {
    if (skippedCategories.has(candidate.category)) continue;

    if ("strength" in candidate) {
      if (intensity === "rest") continue; // 휴식 강도 표에는 근력 칸이 없다. (타입을 좁히기 위한 확인)
      const strength = strengthRecommendation(input, intensity);
      if (strength) picked.push(strength);
    } else {
      picked.push({ ...candidate }); // 돌려받은 쪽에서 고쳐도 후보 표가 바뀌지 않게 복사한다.
    }
    if (picked.length === MAX_RECOMMENDATIONS) break;
  }

  // 어제 여러 종류를 모두 힘들게 해서 후보가 전부 빠지면, 추천이 비지 않게 몸을 푸는 가벼운 활동을 추천한다. (추천은 1개 이상)
  if (picked.length === 0) {
    for (const candidate of EXERCISE_CANDIDATES.light) {
      if (!("strength" in candidate)) picked.push({ ...candidate });
    }
  }
  return picked;
}
