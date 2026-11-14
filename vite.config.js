import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the build works under the GitHub Pages project path and on a custom domain.
  base: './',
  build: {
    target: 'es2022',
    // three.js alone is ~700 kB minified; the game is one chunk on purpose.
    chunkSizeWarningLimit: 1500
  }
});
