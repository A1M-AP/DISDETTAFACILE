// Validazioni dei campi del generatore. Funzioni pure, usate nel browser e nei test.

const CF_DISPARI: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

const CF_PERSONA = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

export function normalizzaCodiceFiscale(valore: string): string {
  return valore.replace(/\s+/g, '').toUpperCase();
}

function valorePari(c: string): number {
  return c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 65;
}

/** Codice fiscale di persona fisica (16 caratteri, anche con omocodia) o numerico (11 cifre). */
export function codiceFiscaleValido(valore: string): boolean {
  const cf = normalizzaCodiceFiscale(valore);
  if (/^\d{11}$/.test(cf)) return partitaIvaValida(cf);
  if (!CF_PERSONA.test(cf)) return false;
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf[i];
    somma += i % 2 === 0 ? CF_DISPARI[c] : valorePari(c);
  }
  return String.fromCharCode(65 + (somma % 26)) === cf[15];
}

export function partitaIvaValida(valore: string): boolean {
  if (!/^\d{11}$/.test(valore)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let n = valore.charCodeAt(i) - 48;
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somma += n;
  }
  return (10 - (somma % 10)) % 10 === valore.charCodeAt(10) - 48;
}

const LUNGHEZZE_IBAN: Record<string, number> = {
  IT: 27, SM: 27, VA: 22, DE: 22, FR: 27, ES: 24, AT: 20, BE: 16, NL: 18, PT: 25,
  IE: 22, LU: 20, CH: 21, GB: 22, MT: 31, SI: 19, HR: 21, GR: 27, MC: 27, LT: 20,
};

export function normalizzaIban(valore: string): string {
  return valore.replace(/\s+/g, '').toUpperCase();
}

export function ibanValido(valore: string): boolean {
  const iban = normalizzaIban(valore);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const attesa = LUNGHEZZE_IBAN[iban.slice(0, 2)];
  if (attesa && iban.length !== attesa) return false;
  if (iban.startsWith('IT') && !/^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/.test(iban)) return false;
  const riordinato = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const c of riordinato) {
    const v = c >= 'A' ? String(c.charCodeAt(0) - 55) : c;
    for (const cifra of v) resto = (resto * 10 + (cifra.charCodeAt(0) - 48)) % 97;
  }
  return resto === 1;
}

/** Formatta l'IBAN in gruppi di 4 caratteri per una lettura più semplice. */
export function formattaIban(valore: string): string {
  return normalizzaIban(valore).replace(/(.{4})(?=.)/g, '$1 ');
}

export function capValido(valore: string): boolean {
  return /^\d{5}$/.test(valore.trim());
}

export function provinciaValida(valore: string): boolean {
  return /^[A-Za-z]{2}$/.test(valore.trim());
}

export function emailValida(valore: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valore.trim());
}

export function dataIsoValida(valore: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valore)) return false;
  const [a, m, g] = valore.split('-').map(Number);
  const d = new Date(a, m - 1, g);
  return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === g;
}
