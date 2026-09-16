import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Avoid loading Next.js postcss.config.mjs (Tailwind) during unit tests.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
