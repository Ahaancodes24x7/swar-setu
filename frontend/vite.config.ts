import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
// `npm run dev` = laptop (http://localhost:8080, mic allowed on localhost).
// `npm run dev:mobile` = HTTPS on the LAN so phones/tablets get the microphone too.
export default defineConfig(({ mode }) => ({
  envDir: path.resolve(__dirname, "."),
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/functions/v1": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mode === "mobile" && basicSsl()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
