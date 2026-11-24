// Design Ref: §4.6 입력 검사 규칙, §8 오류 처리 — 입력 5개가 약속한 모양과 범위인지 확인한다.
// 브라우저(입력 화면)와 서버(API) 모두 이 함수를 써서 같은 기준으로 검사한다.

import { z } from "zod";
import { INPUT_LIMITS, STRENGTH_PARTS, WORKOUT_TYPES, WORKOUT_TYPE_LABELS } from "./constants";
import type { RecoveryInput, StrengthPart, WorkoutType, YesterdayWorkout } from "./types";

/**
 * 칸 이름별 안내 문구. 서버의 400 응답 details도 이 모양이다.
 * 칸 이름: "yesterdayWorkouts"(어제 운동 선택 전체), "yesterdayWorkouts.<종류>.minutes" / ".effort" / ".strengthParts"(운동 종류별 칸),
 * "sleepHours", "soreness", "_form"(입력 형식 자체가 틀림)
 */
export type FieldErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; data: RecoveryInput }
  | { ok: false; errors: FieldErrors };

interface NumberRule {
  min: number;
  max: number;
  step: number;
}

/** 운동 종류 이름 앞에 붙여 "유산소 운동 시간" 같은 문구를 만든다. */
const label = (type: WorkoutType) => WORKOUT_TYPE_LABELS[type];

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
const typeSchema = z.enum(WORKOUT_TYPES as readonly [WorkoutType, ...WorkoutType[]], { error: "어제 운동 종류를 선택해 주세요." });

const sleepSchema = numberSchema(sleepHours, {
  required: "수면 시간을 입력해 주세요.",
  notNumber: "수면 시간은 숫자로 입력해 주세요.",
  range: `수면 시간은 ${sleepHours.min}~${sleepHours.max}시간 사이로 입력해 주세요.`,
  step: `수면 시간은 ${sleepHours.step}시간 단위로 입력해 주세요.`,
});

/** 운동 시간 검사기. 안내 문구에 운동 종류 이름을 넣는다. */
const minutesSchema = (type: WorkoutType) =>
  numberSchema(yesterdayMinutes, {
    required: `${label(type)} 운동 시간을 입력해 주세요.`,
    notNumber: `${label(type)} 운동 시간은 숫자로 입력해 주세요.`,
    range: `${label(type)} 운동 시간은 ${yesterdayMinutes.min}~${yesterdayMinutes.max}분 사이로 입력해 주세요.`,
    step: `${label(type)} 운동 시간은 정수(분)로 입력해 주세요.`,
  });

/** 힘든 정도 검사기. 안내 문구에 운동 종류 이름을 넣는다. */
const effortSchema = (type: WorkoutType) =>
  numberSchema(yesterdayEffort, {
    required: `${label(type)} 힘든 정도를 입력해 주세요.`,
    notNumber: `${label(type)} 힘든 정도는 숫자로 입력해 주세요.`,
    range: `${label(type)} 힘든 정도는 ${yesterdayEffort.min}~${yesterdayEffort.max} 사이로 입력해 주세요.`,
    step: `${label(type)} 힘든 정도는 정수로 입력해 주세요.`,
  });

const partsSchema = z
  .array(z.enum(STRENGTH_PARTS as readonly [StrengthPart, ...StrengthPart[]]), { error: "근력 운동에서 쓴 부위를 골라 주세요." })
  .min(1, "근력 운동에서 쓴 부위를 하나 이상 골라 주세요.");

const sorenessSchema = numberSchema(soreness, {
  required: "근육통 정도를 입력해 주세요.",
  notNumber: "근육통 정도는 숫자로 입력해 주세요.",
  range: `근육통 정도는 ${soreness.min}~${soreness.max} 사이로 입력해 주세요.`,
  step: "근육통 정도는 정수로 입력해 주세요.",
});

/** 어제 운동 목록의 한 항목을 검사한다. 틀린 칸은 errors에 칸 이름으로 기록하고, 모두 맞으면 정리된 항목을 돌려준다. */
function validateWorkout(raw: unknown, errors: FieldErrors): YesterdayWorkout | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.yesterdayWorkouts = "어제 운동 정보 형식이 올바르지 않습니다.";
    return undefined;
  }
  const item = raw as Record<string, unknown>;

  const typeResult = typeSchema.safeParse(item.type);
  if (!typeResult.success) {
    errors.yesterdayWorkouts = typeResult.error.issues[0]?.message ?? "어제 운동 종류를 선택해 주세요.";
    return undefined;
  }
  const type = typeResult.data;
  const field = `yesterdayWorkouts.${type}`;

  const minutes = minutesSchema(type).safeParse(item.minutes);
  const effort = effortSchema(type).safeParse(item.effort);
  if (!minutes.success) errors[`${field}.minutes`] = minutes.error.issues[0]?.message ?? "입력값을 확인해 주세요.";
  if (!effort.success) errors[`${field}.effort`] = effort.error.issues[0]?.message ?? "입력값을 확인해 주세요.";

  // 근력 운동만 쓴 부위를 받는다. (다른 종류에 온 부위는 무시한다)
  let strengthParts: StrengthPart[] | undefined;
  if (type === "strength") {
    const parts = partsSchema.safeParse(item.strengthParts);
    if (parts.success) strengthParts = [...new Set(parts.data)];
    else errors[`${field}.strengthParts`] = parts.error.issues[0]?.message ?? "근력 운동에서 쓴 부위를 골라 주세요.";
  }

  if (!minutes.success || !effort.success || (type === "strength" && strengthParts === undefined)) return undefined;
  return { type, minutes: minutes.data, effort: effort.data, ...(strengthParts ? { strengthParts } : {}) };
}

/**
 * 입력을 검사한다.
 * - 잘못된 칸은 모두 한 번에 알려 준다. (칸 이름 → 안내 문구)
 * - 어제 운동은 목록으로 받는다. 비어 있으면 "어제 운동 안 함"이고, 같은 종류가 두 번 있으면 오류이다.
 * - 목록의 운동마다 시간과 힘든 정도가 있어야 하고, 근력 운동은 쓴 부위가 하나 이상 있어야 한다.
 */
export function validateRecoveryInput(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { _form: "입력 형식이 올바르지 않습니다." } };
  }

  const input = raw as Record<string, unknown>;
  const errors: FieldErrors = {};

  /** 숫자 칸 하나를 검사하고, 틀렸으면 errors에 첫 안내 문구만 기록한다. */
  function check(field: "sleepHours" | "soreness", schema: z.ZodType<number>, value: unknown): number | undefined {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    errors[field] = result.error.issues[0]?.message ?? "입력값을 확인해 주세요.";
    return undefined;
  }

  const sleep = check("sleepHours", sleepSchema, input.sleepHours);
  const sore = check("soreness", sorenessSchema, input.soreness);

  const workouts: YesterdayWorkout[] = [];
  if (!Array.isArray(input.yesterdayWorkouts)) {
    errors.yesterdayWorkouts = "어제 한 운동을 선택해 주세요. 운동을 안 했다면 빈 목록으로 보내 주세요.";
  } else if (input.yesterdayWorkouts.length > WORKOUT_TYPES.length) {
    errors.yesterdayWorkouts = "어제 운동 종류가 너무 많습니다.";
  } else {
    for (const rawWorkout of input.yesterdayWorkouts) {
      const workout = validateWorkout(rawWorkout, errors);
      if (!workout) continue;
      if (workouts.some((existing) => existing.type === workout.type)) {
        errors.yesterdayWorkouts = `${label(workout.type)} 운동이 두 번 들어 있어요. 종류마다 한 번만 입력해 주세요.`;
        continue;
      }
      workouts.push(workout);
    }
  }

  if (Object.keys(errors).length > 0 || sleep === undefined || sore === undefined) {
    return { ok: false, errors };
  }

  // 입력에 있던 다른 키는 버리고, 검사를 통과한 값으로 새로 조립한다.
  return { ok: true, data: { yesterdayWorkouts: workouts, sleepHours: sleep, soreness: sore } };
}
