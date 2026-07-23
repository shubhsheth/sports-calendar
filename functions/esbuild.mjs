import { build } from "esbuild";

// Bundle the Cloud Function into a single self-contained file. The
// @sports-calendar/shared workspace (TS source, Deno-style `.ts` imports) and
// hono/ics/dayjs are inlined; the Firebase runtime provides
// firebase-admin/firebase-functions, so those stay external and are installed
// from functions/package.json in the cloud.
await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: [
    "firebase-admin",
    "firebase-admin/*",
    "firebase-functions",
    "firebase-functions/*",
  ],
  logLevel: "info",
});
