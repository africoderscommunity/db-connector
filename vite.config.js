import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '.'), // where your index.html lives
  base: './', // makes all asset paths relative, important for Electron
  build: {
    outDir: path.resolve(__dirname, 'dist'), // output folder for Electron
    emptyOutDir: true,
  },
    server: {
    port: 5173
  },
    theme: {
    extend: {
      colors: {
        primary: '#6cc523ff',
        // primary: '#4F46E5',
        accent: '#F59E0B',
        darkBg: '#0F172A',
        lightBg: '#F8FAFC',
        textLight: '#E2E8F0',
        textMuted: '#94A3B8',
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
],
});


 