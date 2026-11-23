"use client";

// Design Ref: §3 화면 구성 — 입력 5개 칸과 "확인하기" 버튼. 휴대폰 세로 화면을 기준으로 한 줄(한 열)로 배치한다.
// Plan SC: 입력 5개, "어제 운동 안 함"이면 시간·힘든 정도 칸을 숨기고, 잘못된 값에는 안내를 보여 준다.
// 입력이 모두 올바르면 onSubmit으로 검사를 통과한 입력을 넘긴다. 서버 호출과 결과 화면은 RecoveryScreen이 맡는다.

import { useState } from "react";
import type { FormEvent } from "react";
import { INPUT_LIMITS, YESTERDAY_TYPE_LABELS } from "@/lib/recovery/constants";
import { EMPTY_FORM_VALUES, parseFormValues } from "@/lib/recovery/form";
import type { FormValues } from "@/lib/recovery/form";
import type { RecoveryInput, YesterdayType } from "@/lib/recovery/types";
import type { FieldErrors } from "@/lib/recovery/validate";

/** 칸의 위에서 아래 순서. 잘못된 칸이 여럿이면 가장 위의 칸으로 커서를 옮긴다. */
const FIELD_ORDER: (keyof FormValues)[] = [
  "yesterdayType",
  "yesterdayMinutes",
  "yesterdayEffort",
  "sleepHours",
  "soreness",
];

const TYPE_OPTIONS = Object.entries(YESTERDAY_TYPE_LABELS) as [YesterdayType, string][];

/** 칸의 id. 안내 문구를 칸에 연결할 때도 쓴다. */
const fieldId = (name: keyof FormValues) => `field-${name}`;

/** 칸 이름 글자 스타일 */
const LABEL_CLASS = "text-sm font-medium";
/** 보조 설명 글자 스타일 */
const HINT_CLASS = "break-keep text-xs text-zinc-600 dark:text-zinc-400";
/** 잘못된 값 안내 글자 스타일 */
const ERROR_CLASS = "text-sm text-red-700 dark:text-red-400";
/** 글자·숫자 입력 칸 스타일. 16px 글자라 휴대폰에서 칸을 누를 때 화면이 확대되지 않는다. */
const CONTROL_CLASS =
  "h-11 w-full rounded-lg border border-zinc-300 bg-background px-3 text-base text-foreground " +
  "dark:border-zinc-600 aria-[invalid=true]:border-red-600 dark:aria-[invalid=true]:border-red-400 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/** 칸 설명과 오류 안내를 칸에 이어 주는 id 목록 */
function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

interface NumberFieldProps {
  name: keyof FormValues;
  label: string;
  unit: string;
  hint: string;
  value: string;
  error?: string;
  step: number;
  inputMode: "numeric" | "decimal";
  onChange: (name: keyof FormValues, value: string) => void;
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
          onChange={(event) => onChange(name, event.target.value)}
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
  name: keyof FormValues;
  legend: string;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
  value: string;
  error?: string;
  /** Tailwind는 클래스 이름을 글자 그대로 읽어야 해서, 열 개수 클래스를 통째로 받는다. */
  columnsClass: string;
  onChange: (name: keyof FormValues, value: string) => void;
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
              name={name}
              value={String(number)}
              checked={value === String(number)}
              onChange={() => onChange(name, String(number))}
              className="peer sr-only"
            />
            <span
              className={
                "flex h-11 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-base font-medium " +
                "hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800 " +
                "peer-checked:border-emerald-700 peer-checked:bg-emerald-700 peer-checked:text-white " +
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700"
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

interface RecoveryFormProps {
  /** 입력이 모두 올바를 때, 검사를 통과한 입력을 넘겨받는다. */
  onSubmit: (input: RecoveryInput) => void;
  /** 결과를 계산하는 동안 true. 버튼을 잠가 같은 요청이 겹치지 않게 한다. */
  submitting?: boolean;
}

export default function RecoveryForm({ onSubmit, submitting = false }: RecoveryFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  /** "어제 운동 안 함"이면 시간과 힘든 정도 칸을 숨긴다. */
  const rested = values.yesterdayType === "none";

  function change(name: keyof FormValues, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
    // 고친 칸의 안내 문구는 바로 지운다.
    setErrors((previous) => {
      if (!(name in previous)) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
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
    const first = FIELD_ORDER.find((name) => result.errors[name]);
    if (first) document.getElementById(fieldId(first))?.focus();
  }

  const { sleepHours, yesterdayMinutes, yesterdayEffort, soreness } = INPUT_LIMITS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">어제 운동</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId("yesterdayType")} className={LABEL_CLASS}>
            어제 한 운동 종류
          </label>
          <select
            id={fieldId("yesterdayType")}
            name="yesterdayType"
            value={values.yesterdayType}
            onChange={(event) => change("yesterdayType", event.target.value)}
            aria-invalid={errors.yesterdayType ? true : undefined}
            aria-describedby={describedBy(fieldId("yesterdayType"), undefined, errors.yesterdayType)}
            className={CONTROL_CLASS}
          >
            <option value="">선택해 주세요</option>
            {TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.yesterdayType && (
            <p id={`${fieldId("yesterdayType")}-error`} className={ERROR_CLASS}>
              {errors.yesterdayType}
            </p>
          )}
        </div>

        {!rested && (
          <>
            <NumberField
              name="yesterdayMinutes"
              label="어제 운동 시간"
              unit="분"
              hint={`${yesterdayMinutes.min}~${yesterdayMinutes.max}분 사이의 정수로 적어 주세요.`}
              value={values.yesterdayMinutes}
              error={errors.yesterdayMinutes}
              step={yesterdayMinutes.step}
              inputMode="numeric"
              onChange={change}
            />
            <ScaleField
              name="yesterdayEffort"
              legend="어제 힘든 정도"
              min={yesterdayEffort.min}
              max={yesterdayEffort.max}
              lowLabel="매우 가벼움"
              highLabel="매우 힘듦"
              value={values.yesterdayEffort}
              error={errors.yesterdayEffort}
              columnsClass="grid-cols-5"
              onChange={change}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">오늘 컨디션</h2>

        <NumberField
          name="sleepHours"
          label="어젯밤 수면 시간"
          unit="시간"
          hint={`${sleepHours.min}~${sleepHours.max}시간 사이로, ${sleepHours.step}시간 단위까지 적을 수 있어요. (예: 6.5)`}
          value={values.sleepHours}
          error={errors.sleepHours}
          step={sleepHours.step}
          inputMode="decimal"
          onChange={change}
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
          onChange={change}
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className={
          "h-12 w-full rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        }
      >
        {submitting ? "계산 중…" : "확인하기"}
      </button>
    </form>
  );
}
