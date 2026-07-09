import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:3002' }
  },
  build: {
    rollupOptions: {
      input: {
        main:     path.resolve(__dirname, 'index.html'),
        employee: path.resolve(__dirname, 'employee.html'),
      }
    }
  }
});
