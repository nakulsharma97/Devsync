import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Output to root dist/ so Freebuff preview can serve it
    outDir: "../dist",
    emptyOutDir: true,
    // Enable source maps for better debugging (disable in production if needed)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Deliberately minimal manual chunking.
        //
        // An earlier config grouped recharts ('charts') and framer-motion
        // ('framer-motion') into their own vendor chunks. That backfired: Rollup
        // places modules shared between a manual chunk and the rest of the app
        // *inside* the manual chunk, which created reverse dependencies. Because
        // framer-motion pulls in react/jsx-runtime, the 127 kB framer-motion
        // chunk became a static dependency of every JSX-rendering module —
        // including the public landing page, which never uses it. The same
        // happened to recharts' shared helpers in the charts chunk. Both had to
        // be downloaded before the app could start.
        //
        // Letting Rollup split automatically means each heavy library lands with
        // the lazily-loaded page that actually imports it, and genuinely shared
        // code gets hoisted into small common chunks instead.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime', 'react-router'],
          'core-utils': ['clsx', 'tailwind-merge'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'esnext',
    // Minify options - using esbuild (faster than terser)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      // Radix UI packages - needed by dev server for pre-bundling
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
    ],
  },
  // Serve the production build with the same /api + /ws proxying as the dev
  // server, so `npm run preview` is a usable end-to-end local environment
  // (and not just a static file server that 404s every backend call).
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  // Performance hints
  server: {
    // Freebuff requires HMR to remain disabled to avoid serving source .tsx files
    hmr: false,
    // Proxy /api and /ws to the Spring Boot backend so the same-origin URL
    // scheme works in development exactly as it does behind nginx in production.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
