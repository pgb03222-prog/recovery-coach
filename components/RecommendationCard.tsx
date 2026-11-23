// Design Ref: §3 화면 구성 — 오늘의 강도, 추천 운동 1~3개와 한 줄 이유, 설명 문장을 보여 준다.
// Plan SC: 추천은 1~3개, 각각 한 줄 이유가 함께 표시된다. 강도는 색이나 막대만이 아니라 글자로도 읽을 수 있어야 한다.

import { INTENSITY_LABELS, INTENSITY_ORDER } from "@/lib/recovery/constants";
import type { Intensity, Recommendation } from "@/lib/recovery/types";

interface RecommendationCardProps {
  /** 오늘의 강도 */
  intensity: Intensity;
  /** 추천 운동. 1~3개 */
  recommendations: Recommendation[];
  /** 설명 문장 */
  explanation: string;
}

export default function RecommendationCard({ intensity, recommendations, explanation }: RecommendationCardProps) {
  const currentStep = INTENSITY_ORDER.indexOf(intensity);

  return (
    <section
      aria-labelledby="recommendation-heading"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
    >
      <h2 id="recommendation-heading" className="text-lg font-semibold">
        오늘의 추천
      </h2>

      <div className="flex flex-col gap-2">
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">오늘의 강도</span>
          <span className="text-3xl font-bold">{INTENSITY_LABELS[intensity]}</span>
        </p>
        {/* 4단계 중 어디인지 보여 주는 보조 표시이다. 같은 내용을 위의 글자가 이미 말하고 있어서 화면 읽기 도구에서는 숨긴다. */}
        <ol aria-hidden="true" className="grid grid-cols-4 gap-1.5">
          {INTENSITY_ORDER.map((step, index) => (
            <li key={step} className="flex flex-col gap-1">
              <span
                className={`h-2.5 rounded-full ${index <= currentStep ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-700"}`}
              />
              <span
                className={`text-center text-xs ${index === currentStep ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"}`}
              >
                {INTENSITY_LABELS[step]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <ul className="flex flex-col gap-2">
        {recommendations.map((item) => (
          <li key={item.name} className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
            <p className="text-base font-semibold break-keep">{item.name}</p>
            <p className="text-sm break-keep text-zinc-700 dark:text-zinc-300">{item.reason}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm break-keep">{explanation}</p>
    </section>
  );
}
