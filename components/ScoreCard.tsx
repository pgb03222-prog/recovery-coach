"use client";

// Design Ref: §3 화면 구성 — 회복 점수, 점수 근거, 상담 문구, 근육통 5점 안내를 보여 준다.
// Plan SC: 모든 결과에 점수 근거가 한 줄 이상 표시된다. 점수 숫자만이 아니라 글자로도 읽을 수 있어야 한다.
// 점수는 원형 게이지(보조 표시)와 가운데 큰 숫자로 보여 주고, 게이지 색은 점수 구간(휴식·가벼움·보통·높음)을 따른다.

import { useCountUp } from "@/components/useCountUp";
import { SEVERE_SORENESS_NOTICE } from "@/lib/recovery/notices";
import { scoreBarColor, scoreTextColor } from "@/lib/recovery/score-band";

interface ScoreCardProps {
  /** 회복 점수 (0~100) */
  score: number;
  /** 점수 근거. 한 줄 이상 */
  reasons: string[];
  /** 상담 문구 등 안내 문구 */
  notices: string[];
}

/** 일반 안내 문구 스타일 */
const NOTICE_CLASS = "rounded-2xl bg-surface-soft px-4 py-3 text-sm break-keep";
/** 근육통 5점 안내는 눈에 띄게 하되, 놀라게 하지 않도록 경고색 대신 차분한 호박색을 쓴다. */
const SEVERE_NOTICE_CLASS =
  "rounded-2xl border border-notice-line bg-notice-bg px-4 py-3 text-sm font-medium break-keep text-notice-ink";

/** 원형 게이지 크기. 반지름 52, 선 굵기 10인 원의 둘레(2πr) */
const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export default function ScoreCard({ score, reasons, notices }: ScoreCardProps) {
  const shownScore = useCountUp(score);

  return (
    <section
      aria-labelledby="score-heading"
      className="motion-fade-up flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-card"
    >
      <h2 id="score-heading" className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-base">
          🌿
        </span>
        회복 점수
      </h2>

      <div className="flex flex-col items-center gap-1">
        {/* 점수를 원형 게이지로도 보여 준다. 숫자가 가운데 있어서 게이지는 보조 표시이다. */}
        <div
          role="meter"
          aria-label="회복 점수"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          className={`relative size-44 ${scoreTextColor(score)}`}
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-line" />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="currentColor"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - score / 100)}
              className="motion-ring"
              style={{ "--ring-total": RING_LENGTH, "--delay": "250ms" } as React.CSSProperties}
            />
          </svg>
          <p className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
            {/* 올라가는 숫자는 화면 읽기 도구에서 숨기고, 최종 점수만 한 번 읽게 한다. */}
            <span aria-hidden="true" className="text-5xl font-bold tabular-nums">
              {shownScore}
            </span>
            <span className="sr-only">{score}</span>
            <span className="text-sm text-muted">/ 100점</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold">왜 이 점수인가요?</h3>
        <ul className="flex flex-col gap-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2.5 text-sm break-keep">
              <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${scoreBarColor(score)}`} />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {notices.length > 0 && (
        <div className="flex flex-col gap-2">
          {notices.map((notice) => (
            <p key={notice} className={notice === SEVERE_SORENESS_NOTICE ? SEVERE_NOTICE_CLASS : NOTICE_CLASS}>
              {notice}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
