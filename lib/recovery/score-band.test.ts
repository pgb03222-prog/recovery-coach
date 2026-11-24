// 점수 막대 색이 점수 구간(강도 구간)과 같게 바뀌는지 확인한다.

import { describe, expect, it } from "vitest";
import { SCORE_BAR_COLORS, SCORE_TEXT_COLORS, scoreBarColor, scoreTextColor } from "./score-band";

describe("scoreBarColor", () => {
  it.each([
    [0, "rest"],
    [39, "rest"],
    [40, "light"],
    [60, "light"],
    [61, "moderate"],
    [79, "moderate"],
    [80, "high"],
    [100, "high"],
  ] as const)("%i점은 %s 구간 색이다", (score, band) => {
    expect(scoreBarColor(score)).toBe(SCORE_BAR_COLORS[band]);
    expect(scoreTextColor(score)).toBe(SCORE_TEXT_COLORS[band]);
  });

  it("범위 밖 점수는 오류를 던진다", () => {
    expect(() => scoreBarColor(101)).toThrow(RangeError);
  });
});
