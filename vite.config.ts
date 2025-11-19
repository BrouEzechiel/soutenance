import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// @ts-ignore
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost", // ou "0.0.0.0" si tu veux accéder depuis un autre appareil
    port: 5173,        // port par défaut de Vite
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // permet d'utiliser les alias @/...
    },
  },
});
