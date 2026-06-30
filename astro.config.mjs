// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// Deploys to both hosts: the Vercel adapter produces .vercel/output (Vercel) and
// the static ./dist (which Cloudflare Pages serves directly).
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});
