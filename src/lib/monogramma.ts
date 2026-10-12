// Monogrammi originali dei fornitori: iniziali su un badge nello stile del sito.
// Non riproducono loghi, colori o forme dei marchi: la tinta è scelta dalla palette del sito.

const TINTE = ['var(--sky)', 'var(--violet)', 'var(--accent)', 'var(--mint)', 'var(--amber)', 'var(--rose)'];

/** "Virgin Active" → "VA", "WindTre" → "WT", "Sky" → "S", "DAZN" → "D". */
export function iniziali(nome: string): string {
  const parole = nome.trim().split(/[\s-]+/).filter(Boolean);
  if (parole.length > 1) return (parole[0][0] + parole[1][0]).toUpperCase();
  const camel = /^([A-Z])[a-z]+([A-Z])/.exec(parole[0] ?? '');
  if (camel) return camel[1] + camel[2];
  return (parole[0]?.[0] ?? '?').toUpperCase();
}

/** Tinta stabile per fornitore, ricavata dallo slug. */
export function tinta(slug: string): string {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTE[h % TINTE.length];
}
