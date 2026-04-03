import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/aoe2-balancer/' when deploying to GitHub Pages.
// For Vercel/Netlify, leave it as '/' (the default).
const base = process.env.GITHUB_PAGES ? '/aoe2-balancer/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
