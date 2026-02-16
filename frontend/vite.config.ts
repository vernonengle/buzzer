import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/buzzer/',
  define: {
    'import.meta.env.VITE_WS_URL': JSON.stringify('wss://PLACEHOLDER.execute-api.ap-southeast-1.amazonaws.com/prod'),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})
