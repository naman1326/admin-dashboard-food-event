import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiMiddleware } from './src/server/apiMiddleware.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'email-automation-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware)
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiMiddleware)
      },
    },
  ],
  server: {
    host: true,
  },
})
