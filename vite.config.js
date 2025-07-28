import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to replace __APP_VERSION__ in HTML
const htmlVersionPlugin = () => {
  return {
    name: 'html-version-plugin',
    transformIndexHtml(html) {
      const timestamp = new Date().getTime();
      return html.replace(/__APP_VERSION__/g, timestamp);
    },
  };
};

export default defineConfig({
  root: path.resolve(__dirname, 'src/public/main'), // your custom root
  plugins: [react(), htmlVersionPlugin()],
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
  define: {
    __APP_VERSION__: new Date(),
  },
});
