import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { anthropicApiPlugin } from './server/anthropicPlugin.ts'
import { postcodeApiPlugin } from './server/postcodePlugin.ts'
import { leadWebhookPlugin } from './server/leadWebhookPlugin.ts'
import { emailApiPlugin } from './server/emailApiPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), anthropicApiPlugin(), postcodeApiPlugin(), leadWebhookPlugin(), emailApiPlugin()],
})
