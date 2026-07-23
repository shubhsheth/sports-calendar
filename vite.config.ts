import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  // Firebase Hosting serves at the domain root, so the app lives at "/".
  base: "/",
  plugins: [
    tanstackRouter({
      routesDirectory: "./client/routes",
      generatedRouteTree: "./client/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@sports-calendar/shared": path.resolve(
        __dirname,
        "./shared/src/index.ts"
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/test/setup.ts"],
    // The Firestore rules + e2e tests need the emulator (npm run test:rules).
    exclude: [
      ...configDefaults.exclude,
      "firestore.rules.test.ts",
      "firestore.e2e.test.ts",
    ],
  },
});
