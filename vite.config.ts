import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ??
    (process.env.NODE_ENV === "production" ? "/sports-calendar/" : "/"),
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
    // The calendar function's integration tests run under Deno, not vitest.
    // The Firestore rules tests need the emulator (npm run test:rules).
    exclude: [
      ...configDefaults.exclude,
      "supabase/functions/calendar/**",
      "firestore.rules.test.ts",
    ],
  },
});
