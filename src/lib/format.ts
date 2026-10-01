// Formattazione di date e testi in italiano, senza dipendere dalle impostazioni del browser.

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "2026-10-01" → "1 ottobre 2026". Restituisce la stringa invariata se non è una data ISO. */
export function dataLunga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MESI[Number(m[2]) - 1]} ${m[1]}`;
}

/** Data di oggi nel fuso orario locale, formato AAAA-MM-GG. */
export function oggiIso(adesso: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${adesso.getFullYear()}-${p(adesso.getMonth() + 1)}-${p(adesso.getDate())}`;
}

export function slugify(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Un valore mancante o ancora marcato "DA VERIFICARE" nei file dati. */
export function daVerificare(valore: string | null | undefined): boolean {
  return !valore || !valore.trim() || /DA\s+VERIFICARE/i.test(valore);
}

/** JSON sicuro da inserire in un tag <script> (evita la chiusura anticipata del tag). */
export function jsonSicuro(valore: unknown): string {
  return JSON.stringify(valore).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** "2026-10-01" → "01/10/2026". */
export function dataBreve(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}
