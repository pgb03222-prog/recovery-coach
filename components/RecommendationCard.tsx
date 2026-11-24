// Design Ref: §3 화면 구성 — 오늘의 강도, 추천 운동 1~3개와 한 줄 이유, 설명 문장을 보여 준다.
// Plan SC: 추천은 1~3개, 각각 한 줄 이유가 함께 표시된다. 강도는 색이나 막대만이 아니라 글자로도 읽을 수 있어야 한다.

import { INTENSITY_LABELS, INTENSITY_ORDER } from "@/lib/recovery/constants";
import { SCORE_BAR_COLORS } from "@/lib/recovery/score-band";
import type { ExerciseCategory, Intensity, Recommendation } from "@/lib/recovery/types";

interface RecommendationCardProps {
  /** 오늘의 강도 */
  intensity: Intensity;
  /** 추천 운동. 1~3개 */
  recommendations: Recommendation[];
  /** 설명 문장 */
  explanation: string;
}

/** 운동 종류를 한눈에 알아보게 하는 그림 문자. 장식이라 화면 읽기 도구에서는 숨긴다. */
const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  cardio: "🏃",
  strength: "🏋️",
  sports: "⚽",
  yoga: "🧘",
  rest: "🛌",
};

export default function RecommendationCard({ intensity, recommendations, explanation }: RecommendationCardProps) {
  const currentStep = INTENSITY_ORDER.indexOf(intensity);

  return (
    <section
      aria-labelledby="recommendation-heading"
      className="motion-fade-up flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-card"
      style={{ "--delay": "150ms" } as React.CSSProperties}
    >
      <h2 id="recommendation-heading" className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-base">
          ✨
        </span>
        오늘의 추천
      </h2>

      <div className="flex flex-col gap-3 rounded-2xl bg-accent-soft p-4">
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-muted">오늘의 강도</span>
          <span className="text-3xl font-bold">{INTENSITY_LABELS[intensity]}</span>
        </p>
        {/* 4단계 중 어디인지 보여 주는 보조 표시이다. 같은 내용을 위의 글자가 이미 말하고 있어서 화면 읽기 도구에서는 숨긴다. */}
        <ol aria-hidden="true" className="grid grid-cols-4 gap-1.5">
          {INTENSITY_ORDER.map((step, index) => (
            <li key={step} className="flex flex-col gap-1.5">
              <span
                className={`h-2.5 rounded-full ${index <= currentStep ? `motion-grow-x ${SCORE_BAR_COLORS[intensity]}` : "bg-line"}`}
                style={{ "--delay": `${400 + index * 120}ms` } as React.CSSProperties}
              />
              <span className={`text-center text-xs ${index === currentStep ? "font-bold" : "text-muted"}`}>
                {INTENSITY_LABELS[step]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <ul className="flex flex-col gap-3">
        {recommendations.map((item, index) => (
          <li
            key={item.name}
            className="motion-fade-up flex items-start gap-3 rounded-2xl bg-surface-soft px-4 py-3"
            style={{ "--delay": `${500 + index * 120}ms` } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl shadow-card"
            >
              {CATEGORY_ICONS[item.category]}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-base font-bold break-keep">{item.name}</p>
              <p className="text-sm break-keep text-muted">{item.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-l-4 border-accent pl-3 text-sm leading-relaxed break-keep">{explanation}</p>
    </section>
  );
}
