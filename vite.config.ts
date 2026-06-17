import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Express API runs on :8787; Vite proxies /api to it during dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
