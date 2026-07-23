import { defineConfig } from "vitest/config";

// Dedicated config for the Firestore security-rules tests, which need the
// Firestore emulator (started by `npm run test:rules`). Kept separate from the
// main vitest config so the default `npm run test:run` doesn't try to run them
// without an emulator.
export default defineConfig({
  test: {
    include: ["firestore.rules.test.ts"],
    environment: "node",
    // The rules-testing SDK can be slow to connect on first use.
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
