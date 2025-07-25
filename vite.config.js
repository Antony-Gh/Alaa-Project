import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/public/main'), // your custom root
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/vite'), // output to project-root/dist/vite
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
    historyApiFallback: true, // needed for React Router SPA
  },
});
