import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config() // load env vars from .env

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __VALUE__: `"${process.env.VALUE}"`, // wrapping in "" since it's a string
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  preview: {
    port: 3002,
  },
  proxy: {
    '/api': 'https://torrent-api-py-tt6i.onrender.com/',
  },
})
