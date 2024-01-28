import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from '@svgr/rollup'
import webfontDownload from 'vite-plugin-webfont-dl'
import { VitePWA } from 'vite-plugin-pwa'
import eslintPlugin from '@nabla/vite-plugin-eslint'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import Pages from 'vite-plugin-pages'
import generateSitemap from 'vite-plugin-pages-sitemap'
import Sitemap from 'vite-plugin-sitemap'

const names = ['create', 'browse', 'login', 'search', 'signup', 'tasks']
const dynamicRoutes = names.map((name) => `/${name}`)

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return defineConfig({
    plugins: [
      svgr(),
      react(),
      eslintPlugin(),
      ViteImageOptimizer({}),
      Sitemap({
        hostname: env.VITE_HOSTNAME,
        dynamicRoutes,
      }),

      optimizeCssModules(),
      Pages({
        onRoutesGenerated: (routes) => generateSitemap({ routes }),
      }),
      VitePWA({ registerType: 'autoUpdate' }),
      webfontDownload(),
    ],
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_DEVELOPMENT_PORT) || 3001,
      proxy: {
        '/flaskapi': {
          target: 'http://127.0.0.1:5000/',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/flaskapi/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PRODUCTION_PORT) || 3001,
      proxy: {
        '/flaskapi': {
          target: env.VITE_PIKPAK_PLUS_API,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/flaskapi/, ''),
        },
      },
    },
  })
}
