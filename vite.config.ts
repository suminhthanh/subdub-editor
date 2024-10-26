import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: "/subdub-editor/",
    plugins: [react()],
    server: {
      port: 3000,
      host: "0.0.0.0",
      proxy: {
        "/api": "http://localhost:3000",
      },
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env.DUBBING_API_BASE_URL": JSON.stringify(
        env.DUBBING_API_BASE_URL
      ),
      "process.env.TRANSCRIPTION_API_BASE_URL": JSON.stringify(
        env.TRANSCRIPTION_API_BASE_URL
      ),
      "process.env.MATXA_API_BASE_URL": JSON.stringify(env.MATXA_API_BASE_URL),
      "process.env.APP_MODE": JSON.stringify(env.APP_MODE),
    },
  };
});
