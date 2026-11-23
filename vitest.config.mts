import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 외부 오픈소스 도구(Clawd on Desk)의 시험은 이 앱의 시험이 아니므로 제외한다.
    exclude: [...configDefaults.exclude, "clawd-on-desk/**"],
  },
});
