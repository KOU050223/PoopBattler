import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const BALANCE_TEST_GLOB = "**/*.balance.test.ts";
// バランステストは約54秒かかるので、test:balance（RUN_BALANCE=1）のときだけ走らせる
const isBalanceRun = process.env.RUN_BALANCE === "1";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    exclude: isBalanceRun ? configDefaults.exclude : [...configDefaults.exclude, BALANCE_TEST_GLOB],
  },
});
