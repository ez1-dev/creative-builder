import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Para o web (preview/published) usar base absoluto "/" — caso contrário,
  // ao entrar num deep link como /auth/callback ou /painel-compras o navegador
  // tenta carregar ./assets/... a partir do path atual e dá 404, deixando a
  // tela completamente branca após o login Microsoft.
  // Para o Electron (file://) usamos base relativo via `vite build --mode electron`.
  base: mode === 'electron' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
}));
