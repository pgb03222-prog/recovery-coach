import Disclaimer from "@/components/Disclaimer";
import RecoveryScreen from "@/components/RecoveryScreen";

// Design Ref: §3 화면 구성 — 한 페이지(`/`)에서 위에서 아래로 입력 → 결과 → 참고용 안내 순서로 보인다.
// 입력과 결과 화면은 RecoveryScreen이 이어 붙이고, 참고용 안내 문구는 결과 유무와 상관없이 맨 아래에 항상 있다.

/** 처음 보는 사람에게 앱의 약속을 알려 주는 작은 안내 */
const PROMISES = ["1분이면 끝나요", "입력은 저장하지 않아요", "회원가입이 필요 없어요"];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-10">
      <header className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-accent-soft via-surface to-surface-soft p-6 shadow-card">
        <p className="flex items-center gap-2 text-sm font-medium text-accent-strong">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-surface text-base shadow-card">
            🌱
          </span>
          오늘의 컨디션 체크
        </p>
        <h1 className="text-3xl font-bold tracking-tight">리커버리 코치</h1>
        <p className="text-base leading-relaxed break-keep text-muted">
          어제 운동과 오늘 컨디션을 알려 주세요. 오늘 어느 정도 강도로 어떤 운동을 하면 좋을지 알려 드려요.
        </p>
        <ul className="flex flex-wrap gap-2">
          {PROMISES.map((promise) => (
            <li key={promise} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted shadow-card">
              {promise}
            </li>
          ))}
        </ul>
      </header>
      <RecoveryScreen />
      <Disclaimer />
    </main>
  );
}
