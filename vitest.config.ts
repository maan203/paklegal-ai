import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests run in Node without the app's Cloudflare/TanStack build plugins.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
