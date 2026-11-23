// Design Ref: §4.6 입력 검사 규칙, §8 오류 처리 — 입력 5개가 약속한 모양과 범위인지 확인한다.
// 브라우저(입력 화면)와 서버(API) 모두 이 함수를 써서 같은 기준으로 검사한다.

import { z } from "zod";
import { INPUT_LIMITS } from "./constants";
import type { RecoveryInput, YesterdayType } from "./types";

/** 필드 이름별 안내 문구. 서버의 400 응답 details도 이 모양이다. */
export type FieldErrors = Partial<Record<keyof RecoveryInput | "_form", string>>;

export type ValidationResult =
  | { ok: true; data: RecoveryInput }
  | { ok: false; errors: FieldErrors };

const YESTERDAY_TYPES = ["cardio", "strength", "sports", "yoga", "other", "none"] as const satisfies readonly YesterdayType[];

interface NumberRule {
  min: number;
  max: number;
  step: number;
}

/** 숫자 칸 하나의 검사기를 만든다. 안내 문구는 칸마다 따로 받는다. */
function numberSchema(rule: NumberRule, messages: { required: string; notNumber: string; range: string; step: string }) {
  const base = z
    .number({ error: (issue) => (issue.input === undefined || issue.input === null ? messages.required : messages.notNumber) })
    .min(rule.min, messages.range)
    .max(rule.max, messages.range);
  return rule.step === 1 ? base.int(messages.step) : base.multipleOf(rule.step, messages.step);
}

const { sleepHours, yesterdayMinutes, yesterdayEffort, soreness } = INPUT_LIMITS;

// 범위 숫자는 constants.ts의 값을 읽어서 문구에 넣는다. (규칙을 바꾸면 문구도 함께 바뀐다)
const typeSchema = z.enum(YESTERDAY_TYPES, { error: "어제 운동 종류를 선택해 주세요." });

const sleepSchema = numberSchema(sleepHours, {
  required: "수면 시간을 입력해 주세요.",
  notNumber: "수면 시간은 숫자로 입력해 주세요.",
  range: `수면 시간은 ${sleepHours.min}~${sleepHours.max}시간 사이로 입력해 주세요.`,
  step: `수면 시간은 ${sleepHours.step}시간 단위로 입력해 주세요.`,
});

const minutesSchema = numberSchema(yesterdayMinutes, {
  required: "어제 운동 시간을 입력해 주세요.",
  notNumber: "어제 운동 시간은 숫자로 입력해 주세요.",
  range: `어제 운동 시간은 ${yesterdayMinutes.min}~${yesterdayMinutes.max}분 사이로 입력해 주세요.`,
  step: "어제 운동 시간은 정수(분)로 입력해 주세요.",
});

const effortSchema = numberSchema(yesterdayEffort, {
  required: "어제 힘든 정도를 입력해 주세요.",
  notNumber: "어제 힘든 정도는 숫자로 입력해 주세요.",
  range: `어제 힘든 정도는 ${yesterdayEffort.min}~${yesterdayEffort.max} 사이로 입력해 주세요.`,
  step: "어제 힘든 정도는 정수로 입력해 주세요.",
});

const sorenessSchema = numberSchema(soreness, {
  required: "근육통 정도를 입력해 주세요.",
  notNumber: "근육통 정도는 숫자로 입력해 주세요.",
  range: `근육통 정도는 ${soreness.min}~${soreness.max} 사이로 입력해 주세요.`,
  step: "근육통 정도는 정수로 입력해 주세요.",
});

/**
 * 입력 5개를 검사한다.
 * - 잘못된 칸은 모두 한 번에 알려 준다. (칸 이름 → 안내 문구)
 * - 어제 운동 종류가 "none"(안 함)이면 운동 시간과 힘든 정도는 와도 검사하지 않고 무시한다.
 * - "none"이 아닌데 운동 시간이나 힘든 정도가 없으면 오류이다.
 */
export function validateRecoveryInput(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { _form: "입력 형식이 올바르지 않습니다." } };
  }

  const input = raw as Record<string, unknown>;
  const errors: FieldErrors = {};

  /** 한 칸을 검사하고, 틀렸으면 errors에 첫 안내 문구만 기록한다. */
  function check<T>(field: keyof RecoveryInput, schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    errors[field] = result.error.issues[0]?.message ?? "입력값을 확인해 주세요.";
    return undefined;
  }

  const type = check("yesterdayType", typeSchema, input.yesterdayType);
  const sleep = check("sleepHours", sleepSchema, input.sleepHours);
  const sore = check("soreness", sorenessSchema, input.soreness);

  // 종류를 알 수 없으면 시간과 힘든 정도를 검사할 수 없으므로 건너뛴다.
  let minutes: number | undefined;
  let effort: number | undefined;
  if (type !== undefined && type !== "none") {
    minutes = check("yesterdayMinutes", minutesSchema, input.yesterdayMinutes);
    effort = check("yesterdayEffort", effortSchema, input.yesterdayEffort);
  }

  if (Object.keys(errors).length > 0 || type === undefined || sleep === undefined || sore === undefined) {
    return { ok: false, errors };
  }

  if (type === "none") {
    // "어제 운동 안 함"이면 시간과 힘든 정도는 결과에 넣지 않는다.
    return { ok: true, data: { yesterdayType: type, sleepHours: sleep, soreness: sore } };
  }

  return {
    ok: true,
    data: {
      yesterdayType: type,
      yesterdayMinutes: minutes,
      yesterdayEffort: effort,
      sleepHours: sleep,
      soreness: sore,
    },
  };
}
