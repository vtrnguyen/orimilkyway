import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/orimilkyway/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React separate: otherwise the 2D entry eagerly preloads Three
          // because React is also a transitive dependency of React Three Fiber.
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
        },
      },
    },
  },
}));
