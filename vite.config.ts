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
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
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
        'src/App.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/test/**',
        'src/components/world/canopy/**',
        'src/components/world/fx/**',
        'src/components/world/ground/**',
        'src/components/world/tree/**',
        'src/components/world/WorldCanvas.tsx',
        'src/components/world/materials.ts',
        'src/components/world/PostFX.tsx',
        'src/components/world/SkyBackground.tsx',
        'src/components/world/Lighting.tsx',
        'src/components/world/CameraDirector.tsx',
        'src/components/world/AdaptiveQuality.tsx',
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
