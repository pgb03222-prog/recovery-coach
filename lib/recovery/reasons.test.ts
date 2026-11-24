// 점수 근거 문장(reasons.ts)이 DESIGN §4.4 규칙대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { NO_PENALTY_REASON, buildScoreReasons } from "./reasons";
import { calculateRawScore } from "./score";
import type { RecoveryInput } from "./types";
import { input, rested } from "../test-support/inputs";

describe("buildScoreReasons - 문장 내용", () => {
  it("감점이 없으면 '감점 요인이 없어요' 한 줄이다", () => {
    expect(buildScoreReasons(rested(8, 1))).toEqual(["감점 요인이 없어요"]);
    expect(NO_PENALTY_REASON).toBe("감점 요인이 없어요");
  });

  it("감점된 항목마다 이유를 한 줄씩, 정해진 순서로 만든다", () => {
    expect(buildScoreReasons(input("strength", 100, 9, 5.5, 3))).toEqual([
      "수면이 6시간 미만이라 20점 줄었어요",
      "근육통이 3점이라 20점 줄었어요",
      "어제 힘든 정도가 10점 중 9점이라 30점 줄었어요",
      "어제 운동 시간이 100분(90분 이상)이라 10점 줄었어요",
    ]);
  });

  it("감점이 0인 항목은 문장에 넣지 않는다", () => {
    expect(buildScoreReasons(input("cardio", 60, 2, 8, 2))).toEqual(["근육통이 2점이라 10점 줄었어요"]);
  });

  it.each([
    [7, null],
    [6.5, "수면이 7시간 미만이라 10점 줄었어요"],
    [5.5, "수면이 6시간 미만이라 20점 줄었어요"],
    [5, "수면이 6시간 미만이라 20점 줄었어요"],
    [4.5, "수면이 5시간 미만이라 30점 줄었어요"],
  ])("수면 %s시간의 문장", (sleep, expected) => {
    const reasons = buildScoreReasons(rested(sleep, 1));
    // 4.5시간은 상한이 걸려 마지막에 한 줄이 더 붙는다.
    expect(reasons[0]).toBe(expected ?? NO_PENALTY_REASON);
  });
});

describe("buildScoreReasons - 60점 상한", () => {
  it("#3 근육통 때문에 70점이 60점으로 깎였으면 그 이유를 마지막에 더한다", () => {
    expect(buildScoreReasons(input("yoga", 30, 3, 7, 4))).toEqual([
      "근육통이 4점이라 30점 줄었어요",
      "근육통 때문에 점수가 60점까지만 나와요",
    ]);
  });

  it("#14 수면 때문에 70점이 60점으로 깎였으면 수면을 이유로 든다", () => {
    expect(buildScoreReasons(rested(4.5, 1))).toEqual([
      "수면이 5시간 미만이라 30점 줄었어요",
      "수면 때문에 점수가 60점까지만 나와요",
    ]);
  });

  it("조건에 해당해도 점수가 이미 60점 이하이면 상한 문장을 더하지 않는다", () => {
    // 근육통 5점: 60점. 깎이지 않았으므로 "60점까지만 나와요"라고 말하면 틀린 설명이 된다.
    expect(buildScoreReasons(rested(7, 5))).toEqual(["근육통이 5점이라 40점 줄었어요"]);
    // 근육통 4점 + 수면 4시간: 40점
    expect(buildScoreReasons(rested(4, 4))).toEqual([
      "수면이 5시간 미만이라 30점 줄었어요",
      "근육통이 4점이라 30점 줄었어요",
    ]);
  });
});

describe("buildScoreReasons - 모든 입력 조합", () => {
  const cases: RecoveryInput[] = [];
  for (let soreness = 1; soreness <= 5; soreness += 1) {
    for (let sleep = 0; sleep <= 14; sleep += 0.5) {
      cases.push(rested(sleep, soreness));
      cases.push(input("strength", 100, 9, sleep, soreness));
      cases.push(input("cardio", 60, 5, sleep, soreness));
      cases.push(input("yoga", 30, 2, sleep, soreness));
    }
  }

  it("근거는 항상 한 줄 이상이고 빈 문장이 없다", () => {
    for (const value of cases) {
      const reasons = buildScoreReasons(value);
      expect(reasons.length).toBeGreaterThanOrEqual(1);
      for (const reason of reasons) expect(reason.trim()).not.toBe("");
    }
  });

  it("문장에 적힌 감점의 합이 실제 점수와 맞는다", () => {
    for (const value of cases) {
      const reasons = buildScoreReasons(value);
      const total = reasons
        .flatMap((reason) => [...reason.matchAll(/(\d+)점 줄었어요/g)])
        .reduce((sum, match) => sum + Number(match[1]), 0);
      expect(calculateRawScore(value)).toBe(Math.max(0, 100 - total));
    }
  });

  it("'감점 요인이 없어요'는 감점이 하나도 없을 때만 나온다", () => {
    for (const value of cases) {
      const reasons = buildScoreReasons(value);
      const noPenalty = reasons.includes(NO_PENALTY_REASON);
      expect(noPenalty).toBe(calculateRawScore(value) === 100);
      if (noPenalty) expect(reasons).toHaveLength(1);
    }
  });

  it("같은 입력이면 항상 같은 문장이 나온다", () => {
    for (const value of cases) {
      expect(buildScoreReasons(value)).toEqual(buildScoreReasons({ ...value }));
    }
  });
});

describe("검사를 통과하지 못한 입력", () => {
  it("오류를 던진다", () => {
    expect(() => buildScoreReasons(rested(8, 7))).toThrow(RangeError);
    expect(() => buildScoreReasons(input("cardio", 60, 11, 8, 1))).toThrow(RangeError);
  });
});
