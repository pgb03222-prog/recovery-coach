"use client";

// 0에서 목표 숫자까지 부드럽게 올라가는 값을 돌려준다. 점수 숫자 연출에 쓴다.
// 기기에서 '동작 줄이기'를 켜 두었다면 올라가지 않고 바로 목표 숫자를 보여 준다.

import { useEffect, useState } from "react";

/** 처음에는 빠르게, 끝에서는 천천히 멈추는 곡선 (0~1 → 0~1) */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, durationMs = 900, delayMs = 150): number {
  // 0에서 시작한다. 값은 화면이 그려지는 순서(requestAnimationFrame) 안에서만 바꾼다.
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let timer: number | undefined;

    if (reduceMotion) {
      // 동작 줄이기: 올라가는 연출 없이 바로 목표 숫자를 보여 준다.
      frame = requestAnimationFrame(() => setValue(target));
    } else {
      timer = window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          setValue(Math.round(easeOutCubic(progress) * target));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, delayMs);
    }

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
