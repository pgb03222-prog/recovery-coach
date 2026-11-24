// Design Ref: §3 화면 구성 — 참고용 안내 문구. 결과가 나오기 전에도, 나온 뒤에도 항상 보인다.
// Plan SC: 점수와 추천이 진단처럼 오해되지 않게 "이 앱은 진단이 아니라 참고용 안내입니다"를 화면에 항상 표시한다.

import { DISCLAIMER_TEXT } from "@/lib/recovery/notices";

export default function Disclaimer() {
  return (
    <footer className="flex items-center justify-center gap-2 rounded-2xl bg-surface-soft px-4 py-3">
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-background">
        i
      </span>
      <p className="text-sm break-keep text-muted">{DISCLAIMER_TEXT}</p>
    </footer>
  );
}
