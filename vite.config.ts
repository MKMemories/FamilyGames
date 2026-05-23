import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // Vercel gère automatiquement la base, on peut simplifier
  base: "./", 
  
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});
