import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@sports-calendar/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    globals: true,
  },
});
