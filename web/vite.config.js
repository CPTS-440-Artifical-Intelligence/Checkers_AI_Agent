import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.CHECKERS_API_TARGET ?? 'http://127.0.0.1:8000'
  const repoRoot = fileURLToPath(new URL('..', import.meta.url))

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      fs: {
        allow: [repoRoot]
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('../shared', import.meta.url))
      }
    }
  }
})
