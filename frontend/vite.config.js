import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Shared fixtures live in ../fixtures so the backend tests and the frontend use the same files.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@fixtures": path.resolve(__dirname, "../fixtures") } },
  server: {
    port: 5173,
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    env: { VITE_USE_FIXTURES: "true" }, // tests always run on fixtures, whatever frontend/.env says
    setupFiles: ["./src/setupTests.js"],
  },
});
