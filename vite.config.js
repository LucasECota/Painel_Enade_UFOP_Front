import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    // endereço da API sempre o padrão nos testes, mesmo que exista um .env.local
    env: { VITE_API_URL: "" },
  },
});
