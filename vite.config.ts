import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works both at a custom domain root and under
// https://theparthi.github.io/Its_me_Parthiban/.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (/[\\/](three|@react-three|three-stdlib|troika-[^\\/]+)[\\/]/.test(id)) return 'three'
          if (/[\\/](gsap|lenis)[\\/]/.test(id)) return 'scroll'
        },
      },
    },
  },
})
