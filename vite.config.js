import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            if (id.includes('@mui/icons-material')) {
              return 'mui-icons';
            }
            if (id.includes('@mui/material') || id.includes('@emotion')) {
              return 'mui-core';
            }
            if (id.includes('react-router')) {
              return 'router';
            }
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor';
            }
          }
        },
      },
    },
  },
});
