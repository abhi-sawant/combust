import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'icon-192.svg'],
      manifest: {
        name: 'Combust - Fuel Tracker',
        short_name: 'Combust',
        description: 'Track your fuel consumption, spending, and vehicle efficiency',
        theme_color: '#7f22fe',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Inter is bundled locally via @fontsource-variable and precached by
        // globPatterns below (it's a .woff2 in the build output) — the app
        // never requests fonts.googleapis.com, so a runtime-caching rule for
        // it cached nothing. Supabase REST responses are deliberately left
        // out of workbox's cache too: the app already has its own
        // offline-first layer (IndexedDB + a sync queue in fuelService.ts)
        // that's aware of sync state, soft-deletes, and conflict resolution.
        // A second, dumber HTTP-cache layer over the same requests would
        // just be a second place for the same data to go stale.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
