// Design Ref: §3 화면 구성 — 회복 점수, 점수 근거, 상담 문구, 근육통 5점 안내를 보여 준다.
// Plan SC: 모든 결과에 점수 근거가 한 줄 이상 표시된다. 점수 숫자만이 아니라 글자로도 읽을 수 있어야 한다.

"use client";

import { useCountUp } from "@/components/useCountUp";
import { SEVERE_SORENESS_NOTICE } from "@/lib/recovery/notices";
import { scoreBarColor } from "@/lib/recovery/score-band";

interface ScoreCardProps {
  /** 회복 점수 (0~100) */
  score: number;
  /** 점수 근거. 한 줄 이상 */
  reasons: string[];
  /** 상담 문구 등 안내 문구 */
  notices: string[];
}

/** 일반 안내 문구 스타일 */
const NOTICE_CLASS = "rounded-lg bg-zinc-100 px-3 py-2 text-sm break-keep dark:bg-zinc-800";
/** 근육통 5점 안내는 눈에 띄게 하되, 놀라게 하지 않도록 경고색 대신 차분한 강조색을 쓴다. */
const SEVERE_NOTICE_CLASS =
  "rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium break-keep text-amber-950 " +
  "dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100";

export default function ScoreCard({ score, reasons, notices }: ScoreCardProps) {
  const shownScore = useCountUp(score);

  return (
    <section
      aria-labelledby="score-heading"
      className="motion-fade-up flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
    >
      <h2 id="score-heading" className="text-lg font-semibold">
        회복 점수
      </h2>

      <div className="flex flex-col gap-2">
        <p className="flex items-baseline gap-1">
          {/* 올라가는 숫자는 화면 읽기 도구에서 숨기고, 최종 점수만 한 번 읽게 한다. */}
          <span aria-hidden="true" className="text-5xl font-bold tabular-nums">
            {shownScore}
          </span>
          <span className="sr-only">{score}</span>
          <span className="text-lg text-zinc-600 dark:text-zinc-400">/ 100점</span>
        </p>
        {/* 점수를 막대로도 보여 준다. 숫자가 이미 옆에 있어서 보조 표시이다. */}
        <div
          role="meter"
          aria-label="회복 점수"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
        >
          <div
            className={`motion-grow-x h-full rounded-full ${scoreBarColor(score)}`}
            style={{ width: `${score}%`, "--delay": "250ms" } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">왜 이 점수인가요?</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm break-keep">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
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
