import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'forks',
    fileParallelism: false,
  },
  server: {
    port: 5173,
  },
});
