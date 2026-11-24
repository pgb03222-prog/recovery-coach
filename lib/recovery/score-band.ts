// 점수 막대의 색 구간. 오늘의 강도를 정하는 점수 구간(0~39 / 40~60 / 61~79 / 80~100)과 같게 맞춘다.
// 색은 보조 표시이다. 점수 숫자와 "왜 이 점수인가요?" 글자가 항상 함께 나온다.

import { intensityFromScore } from "./intensity";
import type { Intensity } from "./types";

/**
 * 강도 구간별 색 (Tailwind 클래스). 색 값은 globals.css의 --band-* 이고, 겁을 주는 빨강 대신 차분한 점토색을 쓴다.
 * 막대는 bg-, 원형 게이지는 text-(선 색이 글자색을 따라간다) 클래스를 쓴다.
 */
export const SCORE_BAR_COLORS: Record<Intensity, string> = {
  rest: "bg-band-rest",
  light: "bg-band-light",
  moderate: "bg-band-moderate",
  high: "bg-band-high",
};

export const SCORE_TEXT_COLORS: Record<Intensity, string> = {
  rest: "text-band-rest",
  light: "text-band-light",
  moderate: "text-band-moderate",
  high: "text-band-high",
};

/** 점수에 맞는 원형 게이지 선 색 클래스를 돌려준다. */
export function scoreTextColor(score: number): string {
  return SCORE_TEXT_COLORS[intensityFromScore(score)];
}

/** 점수에 맞는 막대 색 클래스를 돌려준다. */
export function scoreBarColor(score: number): string {
  return SCORE_BAR_COLORS[intensityFromScore(score)];
}
