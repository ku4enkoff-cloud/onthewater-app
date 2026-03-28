import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Дефолт, если в .env нет VITE_YANDEX_MAPS_API_KEY (карта не должна «пустеть» на проде). */
const DEFAULT_YANDEX_MAPS_KEY = '3ef18928-4a00-4fc3-bf4c-c49ad5429220'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const yandexMapsKey = String(
    env.VITE_YANDEX_MAPS_API_KEY ||
      env.VITE_YANDEX_MAPKIT_API_KEY ||
      DEFAULT_YANDEX_MAPS_KEY,
  ).trim()

  return {
    define: {
      // Подставляется на этапе сборки — не зависит от того, как бандлер сворачивает import.meta.env
      __YANDEX_MAPS_API_KEY_RESOLVED__: JSON.stringify(yandexMapsKey),
    },
    plugins: [react()],
    server: {
      proxy: {
        '/boats': { target: 'http://localhost:3000', changeOrigin: true },
        '/boat-types': { target: 'http://localhost:3000', changeOrigin: true },
        '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
        '/destinations': { target: 'http://localhost:3000', changeOrigin: true },
      },
    },
  }
})
