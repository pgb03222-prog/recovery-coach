// Design Ref: §3 화면 구성 — 참고용 안내 문구. 결과가 나오기 전에도, 나온 뒤에도 항상 보인다.
// Plan SC: 점수와 추천이 진단처럼 오해되지 않게 "이 앱은 진단이 아니라 참고용 안내입니다"를 화면에 항상 표시한다.

import { DISCLAIMER_TEXT } from "@/lib/recovery/notices";

export default function Disclaimer() {
  return (
    <footer className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
      <p className="text-sm break-keep text-zinc-700 dark:text-zinc-300">{DISCLAIMER_TEXT}</p>
    </footer>
  );
}
