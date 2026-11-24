import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // server-only는 Next.js 빌드에서 쓰는 표시이다. 시험(vitest)에서는 아무 일도 하지 않는 파일로 바꿔 둔다.
    alias: { "server-only": fileURLToPath(new URL("./lib/test-support/server-only.ts", import.meta.url)) },
  },
  test: {
    // 외부 오픈소스 도구(Clawd on Desk)의 시험은 이 앱의 시험이 아니므로 제외한다.
    exclude: [...configDefaults.exclude, "clawd-on-desk/**"],
  },
});
