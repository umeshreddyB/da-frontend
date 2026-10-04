import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function stripBrowserOrigin(proxy) {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.removeHeader('origin');
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:5050';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: stripBrowserOrigin,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          configure: stripBrowserOrigin,
        },
      },
    },
  };
});
