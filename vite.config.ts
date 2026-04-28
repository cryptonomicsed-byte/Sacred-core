import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/api')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.API_URL': JSON.stringify(env.API_URL || 'http://localhost:4000')
      },
      resolve: {
        alias: {
          '@app': path.resolve(__dirname, './src/application'),
          '@infra': path.resolve(__dirname, './src/infrastructure'),
          '@domain': path.resolve(__dirname, './src/domain'),
          '@shared': path.resolve(__dirname, './src/shared'),
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
