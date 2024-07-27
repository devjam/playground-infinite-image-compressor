import mdx from '@astrojs/mdx'
import tailwind from '@astrojs/tailwind'
import icon from 'astro-icon'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://playground.shiftbrain.com/',
  base: '/post/template',
  server: { open: '/post/template' },
  prefetch: true,
  integrations: [mdx(), tailwind({ nesting: true }), icon()],
  vite: {
    define: {
      'import.meta.vitest': 'undefined',
    },
  },
})
