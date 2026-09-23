import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  // Load .env.local into process.env so server functions can read it via process.env
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [
      // Runs server code in Cloudflare's runtime so the AI + VECTORIZE bindings (legal knowledge
      // base) work in dev too. They connect to your Cloudflare account, so `npx wrangler login`
      // is needed; set RAG_OFFLINE=1 to run without them (chat then answers without sources).
      cloudflare({ viteEnvironment: { name: "ssr" }, remoteBindings: env.RAG_OFFLINE !== "1" }),
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({ server: { entry: "server" } }),
      react(),
    ],
  };
});
