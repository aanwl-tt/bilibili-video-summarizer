import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Separate build for floating panel — produces a single self-contained IIFE file
// (no ES module imports, works as a content script without "type": "module")
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content/floating.tsx"),
      formats: ["iife"],
      name: "BiliSummarizerFloating",
    },
    rollupOptions: {
      output: {
        entryFileNames: "floating.js",
      },
    },
    target: "es2020",
    minify: false,
  },
});
