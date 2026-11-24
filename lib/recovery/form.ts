// Design Ref: §3 화면 구성, §4.6 입력 검사 규칙 — 입력 화면의 칸 값을 검사 함수가 받는 입력으로 바꾼다.
// 화면의 칸은 모두 글자(문자열)나 체크 상태로 들어오므로, 숫자로 바꾸는 규칙을 화면 코드와 분리해 시험할 수 있게 한다.

import { STRENGTH_PARTS, WORKOUT_TYPES } from "./constants";
import type { StrengthPart, WorkoutType } from "./types";
import { validateRecoveryInput } from "./validate";
import type { ValidationResult } from "./validate";

/** 어제 운동 종류 하나의 칸 값 */
export interface WorkoutFormValue {
  minutes: string;
  effort: string;
  /** 근력 운동에서 쓴 부위 (근력일 때만 쓴다) */
  parts: StrengthPart[];
}

/** 입력 화면 칸의 현재 값 */
export interface FormValues {
  /** "어제 운동 안 함"을 골랐는지 */
  rested: boolean;
  /** 체크한 어제 운동 종류 (여러 개 가능) */
  selectedTypes: WorkoutType[];
  /** 종류마다의 시간·힘든 정도·부위. 체크하지 않은 종류의 값은 쓰지 않는다. */
  workouts: Record<WorkoutType, WorkoutFormValue>;
  sleepHours: string;
  soreness: string;
}

const EMPTY_WORKOUT: WorkoutFormValue = { minutes: "", effort: "", parts: [] };

/** 아무것도 입력하지 않은 처음 상태 */
export const EMPTY_FORM_VALUES: FormValues = {
  rested: false,
  selectedTypes: [],
  workouts: {
    cardio: EMPTY_WORKOUT,
    strength: EMPTY_WORKOUT,
    sports: EMPTY_WORKOUT,
    yoga: EMPTY_WORKOUT,
    other: EMPTY_WORKOUT,
  },
  sleepHours: "",
  soreness: "",
};

/** 앞뒤 공백을 지우고, 빈 칸이면 "값 없음"으로, 아니면 숫자로 바꾼다. (숫자가 아니면 NaN이 되어 검사에서 걸린다) */
function toNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

/**
 * 화면의 칸 값을 검사 함수로 확인한다.
 * - "어제 운동 안 함"이면 운동 종류 칸의 값은 모두 무시한다.
 * - 안 함도 아니고 고른 종류도 없으면 "yesterdayWorkouts" 칸의 안내가 나온다.
 * - 체크한 종류만 검사하고, 체크하지 않은 종류에 남아 있는 값은 무시한다. 종류는 화면에 보이는 순서로 보낸다.
 * - 빈 칸은 "입력해 주세요", 숫자가 아닌 글자는 "숫자로 입력해 주세요" 안내가 나온다.
 */
export function parseFormValues(values: FormValues): ValidationResult {
  let yesterdayWorkouts: unknown[] | undefined;

  if (values.rested) {
    yesterdayWorkouts = [];
  } else if (values.selectedTypes.length > 0) {
    yesterdayWorkouts = WORKOUT_TYPES.filter((type) => values.selectedTypes.includes(type)).map((type) => {
      const value = values.workouts[type];
      return {
        type,
        minutes: toNumber(value.minutes),
        effort: toNumber(value.effort),
        ...(type === "strength" ? { strengthParts: STRENGTH_PARTS.filter((part) => value.parts.includes(part)) } : {}),
      };
    });
  }

  const result = validateRecoveryInput({
    yesterdayWorkouts,
    sleepHours: toNumber(values.sleepHours),
    soreness: toNumber(values.soreness),
  });

  // 화면에서는 "빈 목록으로 보내 주세요" 대신 사용자가 할 일을 안내한다.
  if (!result.ok && yesterdayWorkouts === undefined) {
    result.errors.yesterdayWorkouts = "어제 한 운동을 선택해 주세요. 운동을 안 했다면 '어제 운동 안 함'을 골라 주세요.";
  }
  return result;
}
