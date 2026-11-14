import { defineConfig } from 'vite';

// `base: './'` makes every asset and JSON URL relative, so the same build works at
// the domain root (Cloudflare Pages) and under a repo sub-path (GitHub Pages).
// Override with BASE_PATH=/repo-name/ if an absolute base is preferred.
export default defineConfig({
  base: process.env.BASE_PATH || './',
  build: { target: 'es2020', sourcemap: false },
});
