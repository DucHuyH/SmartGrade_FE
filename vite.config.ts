import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // base: process.env.VITE_BASE_URL || '/SmartGrade',
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'premortuary-jeanetta-slightly.ngrok-free.dev'
    ]
  },
  
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  assetsInclude: ['**/*.pdf', '**/*.svg', '**/*.csv']
})
