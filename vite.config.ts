import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { anthropicApiPlugin } from './server/anthropicPlugin.ts'
import { postcodeApiPlugin } from './server/postcodePlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), anthropicApiPlugin(), postcodeApiPlugin()],
})
