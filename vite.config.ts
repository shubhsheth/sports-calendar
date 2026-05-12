import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

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
  },
});
