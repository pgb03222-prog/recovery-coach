// Design Ref: §3 화면 구성, §4.6 입력 검사 규칙 — 입력 화면의 글자 값을 검사 함수가 받는 입력으로 바꾼다.
// 화면의 칸은 모두 글자(문자열)로 들어오므로, 숫자로 바꾸는 규칙을 화면 코드와 분리해 시험할 수 있게 한다.

import { validateRecoveryInput } from "./validate";
import type { ValidationResult } from "./validate";

/** 입력 화면 칸 5개의 현재 값. 화면에서는 모두 글자로 다룬다. */
export interface FormValues {
  /** 어제 운동 종류 (선택하지 않았으면 빈 글자) */
  yesterdayType: string;
  yesterdayMinutes: string;
  yesterdayEffort: string;
  sleepHours: string;
  soreness: string;
}

/** 아무것도 입력하지 않은 처음 상태 */
export const EMPTY_FORM_VALUES: FormValues = {
  yesterdayType: "",
  yesterdayMinutes: "",
  yesterdayEffort: "",
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
 * - 빈 칸은 "입력해 주세요", 숫자가 아닌 글자는 "숫자로 입력해 주세요" 안내가 나온다.
 * - 어제 운동 종류가 "none"(안 함)이면 운동 시간과 힘든 정도 칸의 값은 무시한다.
 */
export function parseFormValues(values: FormValues): ValidationResult {
  return validateRecoveryInput({
    yesterdayType: values.yesterdayType === "" ? undefined : values.yesterdayType,
    yesterdayMinutes: toNumber(values.yesterdayMinutes),
    yesterdayEffort: toNumber(values.yesterdayEffort),
    sleepHours: toNumber(values.sleepHours),
    soreness: toNumber(values.soreness),
  });
}
