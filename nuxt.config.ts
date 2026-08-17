import { fileURLToPath } from 'node:url'
import { getEnvConfig } from './server/config/env'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  devtools: { enabled: true },
  srcDir: 'app/',
  ssr: false,
  css: ['~/styles/global.css'],
  alias: {
    '@server': fileURLToPath(new URL('./server', import.meta.url)),
    '@assets': fileURLToPath(new URL('./app/assets', import.meta.url)),
  },
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  imports: {
    autoImport: false,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'DeckuDB - Optimize Every Game on the Steam Deck',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'The definitive aggregator of Steam Deck community reports and optimal game settings.',
        },
        { name: 'author', content: 'Daniel J.L. Beltran' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#0370be' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://deckudb.com' },
        { property: 'og:title', content: 'DeckuDB - Optimize Every Game on the Steam Deck' },
        { property: 'og:image', content: 'https://deckudb.com/decku-og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-256x256.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'canonical', href: 'https://deckudb.com' },
      ],
      script: [
        {
          id: 'Cookiebot',
          src: 'https://consent.cookiebot.com/uc.js',
          'data-cbid': '682f333a-218a-4fbd-9668-8586a8031083',
          type: 'text/javascript',
          async: true,
        },
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-DRQ2PH2JHN',
          type: 'text/plain',
          'data-cookieconsent': 'statistics',
          async: true,
        },
      ],
    },
  },
  runtimeConfig: { ...getEnvConfig(), public: { apiBase: '/api' } },
  nitro: {
    experimental: {
      tasks: true,
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', 'lucide-vue-next', 'hls.js'],
    },
  },
})
