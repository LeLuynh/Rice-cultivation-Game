import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // host: true để máy khác cùng mạng LAN mở được bằng IP của máy này
  server: { host: true, port: 5173 },
  // allowedHosts: true để mở qua đường hầm (localhost.run, cloudflared…) cho máy ngoài mạng
  preview: { host: true, port: 4173, allowedHosts: true },
})
