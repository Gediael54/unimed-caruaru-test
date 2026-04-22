import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: "../artifacts/frontend/.vite",
  plugins: [react()],
  build: {
    outDir: "../artifacts/frontend/dist",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/tasks": "http://localhost:5000"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "../artifacts/frontend/coverage"
    }
  }
});
