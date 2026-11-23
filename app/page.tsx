import Disclaimer from "@/components/Disclaimer";
import RecoveryScreen from "@/components/RecoveryScreen";

// Design Ref: §3 화면 구성 — 한 페이지(`/`)에서 위에서 아래로 입력 → 결과 → 참고용 안내 순서로 보인다.
// 입력과 결과 화면은 RecoveryScreen이 이어 붙이고, 참고용 안내 문구는 결과 유무와 상관없이 맨 아래에 항상 있다.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">리커버리 코치</h1>
        <p className="break-keep text-base text-zinc-700 dark:text-zinc-300">
          어제 운동과 오늘 컨디션을 알려 주세요. 오늘 어느 정도 강도로 어떤 운동을 하면 좋을지 알려 드려요.
        </p>
      </header>
      <RecoveryScreen />
      <Disclaimer />
    </main>
  );
}
