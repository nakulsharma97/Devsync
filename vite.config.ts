import { vlyPlugin } from "@vly-ai/integrations";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

// Root config that serves the frontend/ directory
export default defineConfig({
  root: path.resolve(__dirname, "./frontend"),
  plugins: [vlyPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend/src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "./dist"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'convex-vendor': ['convex'],
          'radix-ui': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-hover-card',
            '@radix-ui/react-label', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider',
            '@radix-ui/react-switch', '@radix-ui/react-tabs',
            '@radix-ui/react-toggle', '@radix-ui/react-tooltip',
          ],
          'framer-motion': ['framer-motion'],
          'charts': ['recharts'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', '@convex-dev/auth/react'],
  },
  server: {
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
