import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["spec/**/*.test.ts", "scripts/**/*.test.ts"],
    globalSetup: ["./spec/global-setup.ts"],
    // Every file shares one server and database, and the allocation a test
    // records changes what the others see, so files run one at a time.
    fileParallelism: false,
  },
});
