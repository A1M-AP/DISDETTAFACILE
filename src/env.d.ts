/// <reference types="astro/client" />

declare module '*/site.config.mjs' {
  import type { ConfigSito } from './lib/types';
  const config: ConfigSito;
  export default config;
}
