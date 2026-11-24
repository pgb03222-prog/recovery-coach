"use client";

// Design Ref: §3 화면 구성 — 어제 운동(여러 개 선택), 수면, 근육통 칸과 "확인하기" 버튼. 휴대폰 세로 화면을 기준으로 한 줄(한 열)로 배치한다.
// Plan SC: "어제 운동 안 함"이면 운동 칸을 숨기고, 고른 운동마다 시간·힘든 정도(근력은 쓴 부위도)를 받으며, 잘못된 값에는 안내를 보여 준다.
// 입력이 모두 올바르면 onSubmit으로 검사를 통과한 입력을 넘긴다. 서버 호출과 결과 화면은 RecoveryScreen이 맡는다.

import { useState } from "react";
import type { FormEvent } from "react";
import {
  INPUT_LIMITS,
  STRENGTH_PARTS,
  STRENGTH_PART_LABELS,
  WORKOUT_TYPES,
  WORKOUT_TYPE_LABELS,
} from "@/lib/recovery/constants";
import { EMPTY_FORM_VALUES, parseFormValues } from "@/lib/recovery/form";
import type { FormValues, WorkoutFormValue } from "@/lib/recovery/form";
import type { RecoveryInput, StrengthPart, WorkoutType } from "@/lib/recovery/types";
import type { FieldErrors } from "@/lib/recovery/validate";

/** 칸 이름(오류 안내의 키)으로 칸의 id를 만든다. 안내 문구를 칸에 연결하고 커서를 옮길 때 쓴다. */
const fieldId = (name: string) => `field-${name.replaceAll(".", "-")}`;

/** 잘못된 칸이 여럿이면 가장 위의 칸으로 커서를 옮기기 위한 순서. 선택한 운동 종류별 칸은 화면 순서대로 끼워 넣는다. */
function fieldOrder(selectedTypes: WorkoutType[]): string[] {
  const workoutFields = WORKOUT_TYPES.filter((type) => selectedTypes.includes(type)).flatMap((type) => [
    `yesterdayWorkouts.${type}.minutes`,
    `yesterdayWorkouts.${type}.effort`,
    `yesterdayWorkouts.${type}.strengthParts`,
  ]);
  return ["yesterdayWorkouts", ...workoutFields, "sleepHours", "soreness"];
}

/** 칸 이름 글자 스타일 */
const LABEL_CLASS = "text-sm font-medium";
/** 보조 설명 글자 스타일 */
const HINT_CLASS = "break-keep text-xs text-muted";
/** 잘못된 값 안내 글자 스타일 */
const ERROR_CLASS = "text-sm text-danger";
/** 글자·숫자 입력 칸 스타일. 16px 글자라 휴대폰에서 칸을 누를 때 화면이 확대되지 않는다. */
const CONTROL_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-foreground " +
  "aria-[invalid=true]:border-danger " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** 칸 설명과 오류 안내를 칸에 이어 주는 id 목록 */
function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

interface NumberFieldProps {
  /** 칸 이름. 오류 안내의 키와 같다. */
  name: string;
  label: string;
  unit: string;
  hint: string;
  value: string;
  error?: string;
  step: number;
  inputMode: "numeric" | "decimal";
  onChange: (value: string) => void;
}

/** 숫자를 직접 적는 칸 (수면 시간, 운동 시간) */
function NumberField({ name, label, unit, hint, value, error, step, inputMode, onChange }: NumberFieldProps) {
  const id = fieldId(name);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          type="number"
          inputMode={inputMode}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={CONTROL_CLASS}
        />
        <span className="shrink-0 text-sm">{unit}</span>
      </div>
      <p id={`${id}-hint`} className={HINT_CLASS}>
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}

interface ScaleFieldProps {
  /** 칸 이름. 오류 안내의 키와 같다. */
  name: string;
  legend: string;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
  value: string;
  error?: string;
  /** Tailwind는 클래스 이름을 글자 그대로 읽어야 해서, 열 개수 클래스를 통째로 받는다. */
  columnsClass: string;
  onChange: (value: string) => void;
}

/** 숫자 버튼 중 하나를 고르는 칸 (어제 힘든 정도, 근육통 정도) */
function ScaleField({ name, legend, min, max, lowLabel, highLabel, value, error, columnsClass, onChange }: ScaleFieldProps) {
  const id = fieldId(name);
  const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={describedBy(id, undefined, error)}>
      <legend className={LABEL_CLASS}>{legend}</legend>
      <div className={`grid gap-2 ${columnsClass}`}>
        {numbers.map((number) => (
          <label key={number} className="relative">
            <input
              id={number === min ? id : undefined}
              type="radio"
              name={fieldId(name)}
              value={String(number)}
              checked={value === String(number)}
              onChange={() => onChange(String(number))}
              className="peer sr-only"
            />
            <span
              className={
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-base font-medium " +
                "hover:bg-accent-soft " +
                "peer-checked:border-accent-strong peer-checked:bg-accent-strong peer-checked:text-on-accent " +
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong"
              }
            >
              {number}
            </span>
          </label>
        ))}
      </div>
      <div className={`flex justify-between ${HINT_CLASS}`}>
        <span>
          {min} = {lowLabel}
        </span>
        <span>
          {max} = {highLabel}
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** 체크박스 한 칸 (운동 종류, 근력 부위, 어제 운동 안 함) */
function CheckOption({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={
          "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 text-center text-base font-medium break-keep " +
          "hover:bg-accent-soft " +
          "peer-checked:border-accent-strong peer-checked:bg-accent-strong peer-checked:text-on-accent " +
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong"
        }
      >
        {label}
      </span>
    </label>
  );
}

interface RecoveryFormProps {
  /** 입력이 모두 올바를 때, 검사를 통과한 입력을 넘겨받는다. */
  onSubmit: (input: RecoveryInput) => void;
  /** 결과를 계산하는 동안 true. 버튼을 잠가 같은 요청이 겹치지 않게 한다. */
  submitting?: boolean;
}

export default function RecoveryForm({ onSubmit, submitting = false }: RecoveryFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  /** 고친 칸의 안내 문구를 바로 지운다. */
  function clearErrors(...names: string[]) {
    setErrors((previous) => {
      if (!names.some((name) => name in previous)) return previous;
      const next = { ...previous };
      for (const name of names) delete next[name];
      return next;
    });
  }

  /** 운동 종류 하나를 체크하거나 푼다. 체크하면 "어제 운동 안 함"은 풀린다. */
  function toggleType(type: WorkoutType, checked: boolean) {
    setValues((previous) => ({
      ...previous,
      rested: checked ? false : previous.rested,
      selectedTypes: checked
        ? [...previous.selectedTypes.filter((selected) => selected !== type), type]
        : previous.selectedTypes.filter((selected) => selected !== type),
    }));
    clearErrors("yesterdayWorkouts");
  }

  /** "어제 운동 안 함"을 체크하면 고른 운동은 모두 풀린다. */
  function toggleRested(checked: boolean) {
    setValues((previous) => ({ ...previous, rested: checked, selectedTypes: checked ? [] : previous.selectedTypes }));
    clearErrors("yesterdayWorkouts");
  }

  function changeWorkout(type: WorkoutType, patch: Partial<WorkoutFormValue>, errorName: string) {
    setValues((previous) => ({
      ...previous,
      workouts: { ...previous.workouts, [type]: { ...previous.workouts[type], ...patch } },
    }));
    clearErrors(`yesterdayWorkouts.${type}.${errorName}`);
  }

  function togglePart(type: WorkoutType, part: StrengthPart, checked: boolean) {
    const parts = values.workouts[type].parts;
    const next = checked ? [...parts.filter((p) => p !== part), part] : parts.filter((p) => p !== part);
    changeWorkout(type, { parts: next }, "strengthParts");
  }

  function changeText(name: "sleepHours" | "soreness", value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
    clearErrors(name);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseFormValues(values);

    if (result.ok) {
      setErrors({});
      onSubmit(result.data);
      return;
    }

    setErrors(result.errors);
    // 가장 위의 잘못된 칸으로 커서를 옮겨, 어디를 고칠지 바로 알 수 있게 한다.
    const first = fieldOrder(values.selectedTypes).find((name) => result.errors[name]);
    if (first) document.getElementById(fieldId(first))?.focus();
  }

  const { sleepHours, yesterdayMinutes, yesterdayEffort, soreness } = INPUT_LIMITS;
  const typesError = errors.yesterdayWorkouts;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-base">
            🏃
          </span>
          어제 운동
        </h2>

        <fieldset
          className="flex flex-col gap-1.5"
          aria-describedby={typesError ? `${fieldId("yesterdayWorkouts")}-error` : undefined}
        >
          <legend className={LABEL_CLASS}>어제 한 운동 (여러 개 선택할 수 있어요)</legend>
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map((type, index) => (
              <CheckOption
                key={type}
                id={index === 0 ? fieldId("yesterdayWorkouts") : undefined}
                label={WORKOUT_TYPE_LABELS[type]}
                checked={values.selectedTypes.includes(type)}
                onChange={(checked) => toggleType(type, checked)}
              />
            ))}
            <CheckOption label="어제 운동 안 함" checked={values.rested} onChange={toggleRested} />
          </div>
          {typesError && (
            <p id={`${fieldId("yesterdayWorkouts")}-error`} className={ERROR_CLASS}>
              {typesError}
            </p>
          )}
        </fieldset>

        {WORKOUT_TYPES.filter((type) => values.selectedTypes.includes(type)).map((type) => {
          const workout = values.workouts[type];
          const prefix = `yesterdayWorkouts.${type}`;
          const partsError = errors[`${prefix}.strengthParts`];
          const title = WORKOUT_TYPE_LABELS[type];
          return (
            <div key={type} className="flex flex-col gap-4 rounded-2xl bg-surface-soft p-4">
              <h3 className="text-base font-semibold">{title}</h3>
              <NumberField
                name={`${prefix}.minutes`}
                label={`${title} 운동 시간`}
                unit="분"
                hint={`${yesterdayMinutes.min}~${yesterdayMinutes.max}분 사이의 정수로 적어 주세요.`}
                value={workout.minutes}
                error={errors[`${prefix}.minutes`]}
                step={yesterdayMinutes.step}
                inputMode="numeric"
                onChange={(value) => changeWorkout(type, { minutes: value }, "minutes")}
              />
              <ScaleField
                name={`${prefix}.effort`}
                legend={`${title} 힘든 정도`}
                min={yesterdayEffort.min}
                max={yesterdayEffort.max}
                lowLabel="매우 가벼움"
                highLabel="매우 힘듦"
                value={workout.effort}
                error={errors[`${prefix}.effort`]}
                columnsClass="grid-cols-5"
                onChange={(value) => changeWorkout(type, { effort: value }, "effort")}
              />
              {type === "strength" && (
                <fieldset
                  className="flex flex-col gap-1.5"
                  aria-describedby={partsError ? `${fieldId(`${prefix}.strengthParts`)}-error` : undefined}
                >
                  <legend className={LABEL_CLASS}>어제 쓴 부위 (여러 개 선택할 수 있어요)</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {STRENGTH_PARTS.map((part, index) => (
                      <CheckOption
                        key={part}
                        id={index === 0 ? fieldId(`${prefix}.strengthParts`) : undefined}
                        label={STRENGTH_PART_LABELS[part]}
                        checked={workout.parts.includes(part)}
                        onChange={(checked) => togglePart(type, part, checked)}
                      />
                    ))}
                  </div>
                  <p className={HINT_CLASS}>
                    오늘은 어제 쓴 부위를 쉬게 하고 다른 부위 운동을 추천해요. 전신 운동이었다면 세 부위를 모두 골라 주세요.
                  </p>
                  {partsError && (
                    <p id={`${fieldId(`${prefix}.strengthParts`)}-error`} className={ERROR_CLASS}>
                      {partsError}
                    </p>
                  )}
                </fieldset>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-base">
            🌙
          </span>
          오늘 컨디션
        </h2>

        <NumberField
          name="sleepHours"
          label="어젯밤 수면 시간"
          unit="시간"
          hint={`${sleepHours.min}~${sleepHours.max}시간 사이로, ${sleepHours.step}시간 단위까지 적을 수 있어요. (예: 6.5)`}
          value={values.sleepHours}
          error={errors.sleepHours}
          step={sleepHours.step}
          inputMode="decimal"
          onChange={(value) => changeText("sleepHours", value)}
        />

        <ScaleField
          name="soreness"
          legend="오늘 근육통 정도"
          min={soreness.min}
          max={soreness.max}
          lowLabel="거의 없음"
          highLabel="매우 심함"
          value={values.soreness}
          error={errors.soreness}
          columnsClass="grid-cols-5"
          onChange={(value) => changeText("soreness", value)}
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className={
          "h-12 w-full rounded-2xl bg-accent-strong text-base font-semibold text-on-accent hover:brightness-110 " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        }
      >
        {submitting ? "계산 중…" : "확인하기"}
      </button>
    </form>
  );
}
