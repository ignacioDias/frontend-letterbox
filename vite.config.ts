import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT || '8080'
  const frontendPort = Number(env.VITE_PORT || 5173)
  const proxy = {
    '/api': {
      target: `http://localhost:${backendPort}`,
      changeOrigin: false,
    },
    '/static': {
      target: `http://localhost:${backendPort}`,
      changeOrigin: false,
    },
  }

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      strictPort: true,
      proxy,
    },
    preview: {
      port: frontendPort,
      proxy,
    },
  }
})
