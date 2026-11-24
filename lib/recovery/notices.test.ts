// 안내 문구(notices.ts)가 PRD §5, §7의 문구와 규칙대로 나오는지 확인한다.

import { describe, expect, it } from "vitest";
import { CONSULT_NOTICE, DISCLAIMER_TEXT, SEVERE_SORENESS_NOTICE, buildNotices } from "./notices";
import type { RecoveryInput } from "./types";

const rested = (soreness: number): RecoveryInput => ({ yesterdayWorkouts: [], sleepHours: 8, soreness });

describe("안내 문구", () => {
  it("PRD가 정한 문구와 같다", () => {
    expect(CONSULT_NOTICE).toBe("통증이 계속되면 전문가와 상담하세요");
    expect(SEVERE_SORENESS_NOTICE).toBe("통증이 심하면 운동을 쉬고 전문가와 상의하세요");
    expect(DISCLAIMER_TEXT).toBe("이 앱은 진단이 아니라 참고용 안내입니다");
  });

  it("상담 문구는 근육통이 몇 점이든 항상 들어 있다", () => {
    for (const soreness of [1, 2, 3, 4, 5]) {
      expect(buildNotices(rested(soreness))[0]).toBe(CONSULT_NOTICE);
    }
  });

  it("근육통이 5점일 때만 추가 안내가 붙는다", () => {
    expect(buildNotices(rested(4))).toEqual([CONSULT_NOTICE]);
    expect(buildNotices(rested(5))).toEqual([CONSULT_NOTICE, SEVERE_SORENESS_NOTICE]);
  });

  it("진단이나 치료를 말하는 표현을 쓰지 않는다 (참고용 안내 문구의 '진단이 아니라'는 예외)", () => {
    for (const notice of [CONSULT_NOTICE, SEVERE_SORENESS_NOTICE]) {
      expect(notice).not.toMatch(/진단|치료/);
    }
    expect(DISCLAIMER_TEXT).toContain("진단이 아니라");
  });
});
