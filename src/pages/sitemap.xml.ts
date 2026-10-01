// Sitemap generata automaticamente da pagine statiche, categorie e fornitori indicizzabili.
import type { APIRoute } from 'astro';
import { categorie, config, fornitori, fornitoreIndicizzabile, urlCategoria, urlFornitore } from '../lib/data.ts';

export const GET: APIRoute = () => {
  const statiche = [
    '/',
    '/disdetta/',
    '/recesso-14-giorni/',
    '/come-inviare-una-disdetta/',
    '/chi-siamo/',
    '/contatti/',
    '/privacy-policy/',
    '/cookie-policy/',
    '/note-legali/',
  ];
  const voci: { loc: string; lastmod?: string }[] = [
    ...statiche.map((p) => ({ loc: p })),
    ...categorie.map((c) => ({ loc: urlCategoria(c.slug) })),
    ...fornitori.filter(fornitoreIndicizzabile).map((f) => ({ loc: urlFornitore(f), lastmod: f.ultima_verifica ?? undefined })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${voci
  .map((v) => `  <url><loc>${new URL(v.loc, config.url).href}</loc>${v.lastmod ? `<lastmod>${v.lastmod}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
