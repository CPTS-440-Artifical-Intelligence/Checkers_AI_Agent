import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.CHECKERS_API_TARGET ?? 'http://127.0.0.1:8000'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
