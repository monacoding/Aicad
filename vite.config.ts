import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server port (override with AICAD_WEB_PORT or `vite --port <n>`).
// The Express API runs on :8787; Vite proxies /api to it during dev.
const WEB_PORT = Number(process.env.AICAD_WEB_PORT) || 5180;

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
