import type { APIRoute } from 'astro';
import { config } from '../lib/data.ts';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', config.url).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
