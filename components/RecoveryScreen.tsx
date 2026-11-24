"use client";

// Design Ref: §3 화면 구성, §4 데이터 흐름 — 입력 화면과 결과 화면을 한 페이지에 위에서 아래로 이어 붙인다.
// 입력이 올바르면 서버(POST /api/recommend)를 불러 결과를 받아 입력 화면 아래에 보여 준다.
// 점수 카드 아래에 추천 카드를 이어 붙인다. 참고용 안내 문구(PLAN 14번)는 이 아래에 더한다.

import { useEffect, useRef, useState } from "react";
import RecoveryForm from "@/components/RecoveryForm";
import RecommendationCard from "@/components/RecommendationCard";
import ScoreCard from "@/components/ScoreCard";
import { requestRecommendation } from "@/lib/recovery/api";
import type { RecoveryInput, RecoveryResult } from "@/lib/recovery/types";

export default function RecoveryScreen() {
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(input: RecoveryInput) {
    setSubmitting(true);
    setErrorMessage(null);
    setResult(null); // 이전 입력의 결과가 새 입력의 결과로 오해되지 않게 먼저 지운다.

    const response = await requestRecommendation(input);
    if (response.ok) {
      setResult(response.data);
    } else {
      setErrorMessage(response.message);
    }
    setSubmitting(false);
  }

  // 결과가 나오면 결과 위치로 화면을 옮기고 커서를 둔다. (화면 읽기 도구도 결과를 바로 읽을 수 있다)
  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ block: "start" });
      resultRef.current?.focus();
    }
  }, [result]);

  return (
    <div className="flex flex-col gap-6">
      <RecoveryForm onSubmit={handleSubmit} submitting={submitting} />

      <div role="status" aria-live="polite">
        {submitting && <p className="motion-pulse text-sm text-muted">결과를 계산하고 있어요…</p>}
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm break-keep text-danger">
          {errorMessage}
        </p>
      )}

      {result && (
        <div ref={resultRef} tabIndex={-1} className="flex flex-col gap-6 outline-none">
          <ScoreCard score={result.score} reasons={result.scoreReasons} notices={result.notices} />
          <RecommendationCard
            intensity={result.intensity}
            recommendations={result.recommendations}
            explanation={result.explanation}
          />
        </div>
      )}
    </div>
  );
}
