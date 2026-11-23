import RecoveryForm from "@/components/RecoveryForm";

// Design Ref: §3 화면 구성 — 한 페이지(`/`)에서 위에서 아래로 입력 → 결과 순서로 보인다.
// 결과 화면(점수, 추천)과 참고용 안내 문구는 PLAN 11~14번 작업에서 이 페이지에 이어 붙인다.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">리커버리 코치</h1>
        <p className="break-keep text-base text-zinc-700 dark:text-zinc-300">
          어제 운동과 오늘 컨디션을 알려 주세요. 오늘 어느 정도 강도로 어떤 운동을 하면 좋을지 알려 드려요.
        </p>
      </header>
      <RecoveryForm />
    </main>
  );
}
