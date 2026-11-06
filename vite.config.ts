/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 5174: 5173 is the UTH pipeline's own frontend; the RAG_TS backend (3000) allows this origin by default.
    port: 5174,
    // IPv4 loopback: the Cloudflare tunnel (3d-rag.minio-quangmanh.io.vn) dials http://127.0.0.1:5174, while Vite's
    // default `localhost` binds only [::1] on macOS, so the tunnel got "connection refused" and served 502.
    // Not 0.0.0.0: the dev server stays off the LAN.
    host: '127.0.0.1',
    // Vite rejects unknown Host headers (403); let the tunnel's public hostname through.
    allowedHosts: ['3d-rag.minio-quangmanh.io.vn'],
    proxy: {
      // RAG_TS backend: chat (SSE), papers, health.
      '/api/v1': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      // UTH pipeline (FastAPI, prefix /api): World 3D and the crawl stream.
      '/pipeline': {
        target: process.env.VITE_PIPELINE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pipeline/, '/api'),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@react-three/postprocessing') || id.includes('/postprocessing/')) return 'r3f-postprocessing';
          if (id.includes('@react-three/')) return 'r3f';
          if (id.includes('/three/') || id.includes('three-stdlib') || id.includes('camera-controls')) return 'three';
          if (id.includes('katex') || id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'markdown';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    env: {
      VITE_USE_MOCK: 'true',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/vite-env.d.ts',
        'src/shared/types/**',
        'src/test/**',
        'src/features/world/scene/canopy/**',
        'src/features/world/scene/fx/**',
        'src/features/world/scene/ground/**',
        'src/features/world/scene/tree/**',
        'src/features/world/scene/WorldCanvas.tsx',
        'src/features/world/scene/materials.ts',
        'src/features/world/scene/PostFX.tsx',
        'src/features/world/scene/SkyBackground.tsx',
        'src/features/world/scene/Lighting.tsx',
        'src/features/world/scene/CameraDirector.tsx',
        'src/features/world/scene/AdaptiveQuality.tsx',
        'scripts/**',
        'playwright.config.ts',
        'e2e/**',
        '**/*.test.{ts,tsx}',
        '**/*.bench.ts',
        '**/*.d.ts',
        '.next/**',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
      },
    },
  },
});
