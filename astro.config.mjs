// @ts-check
import { defineConfig } from 'astro/config';
import sito from './site.config.mjs';

export default defineConfig({
  site: sito.url,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Il CSS è piccolo: inserirlo inline evita una richiesta bloccante (migliore LCP su mobile).
    inlineStylesheets: 'always',
  },
  compressHTML: true,
});
