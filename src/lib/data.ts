// Accesso ai file dati (/data) lato build. Gli errori di coerenza bloccano la build.

import categorieJson from '../../data/categorie.json';
import fornitoriJson from '../../data/fornitori.json';
import sito from '../../site.config.mjs';
import type { Categoria, ConfigSito, DatiCategorie, DatiFornitori, Fornitore, Recapiti } from './types.ts';
import { verificaDati } from './data-validate.ts';
import { daVerificare } from './format.ts';

export const config = sito as ConfigSito;
export const datiCategorie = categorieJson as unknown as DatiCategorie;
const datiFornitori = fornitoriJson as unknown as DatiFornitori;

const esito = verificaDati(datiCategorie, datiFornitori);
if (esito.errori.length) {
  throw new Error(`Errori nei file dati:\n- ${esito.errori.join('\n- ')}`);
}

export const categorie: Categoria[] = datiCategorie.categorie;
export const fornitori: Fornitore[] = [...datiFornitori.fornitori].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

export function getCategoria(slug: string): Categoria {
  const c = categorie.find((x) => x.slug === slug);
  if (!c) throw new Error(`Categoria inesistente: ${slug}`);
  return c;
}

export function fornitoriDi(slugCategoria: string): Fornitore[] {
  return fornitori.filter((f) => f.categoria === slugCategoria);
}

export function fornitoreVerificato(f: Fornitore): boolean {
  return f.ultima_verifica !== null;
}

export function fornitoreIndicizzabile(f: Fornitore): boolean {
  return fornitoreVerificato(f) || config.seo.indicizzaFornitoriNonVerificati;
}

/** Recapiti con i valori "DA VERIFICARE" sostituiti da stringhe vuote. */
export function recapitiUtilizzabili(f: Fornitore): Recapiti {
  const r = f.recapiti;
  const pulito = (v: string) => (daVerificare(v) ? '' : v.trim());
  return {
    destinatario: pulito(r.destinatario) || f.nome,
    indirizzo: pulito(r.indirizzo),
    cap: pulito(r.cap),
    citta: pulito(r.citta),
    provincia: pulito(r.provincia),
    pec: pulito(r.pec),
  };
}

export function urlCategoria(slug: string): string {
  return `/disdetta/${slug}/`;
}

export function urlFornitore(f: Fornitore): string {
  return `/disdetta/${f.categoria}/${f.slug}/`;
}

/** Dati minimi passati al generatore nel browser (solo testi pubblici, nessun dato personale). */
export function datiPerGeneratore(slugCategorie: string[]) {
  const cats = categorie.filter((c) => slugCategorie.includes(c.slug));
  return {
    tipi: datiCategorie.tipi_richiesta,
    riferimenti: datiCategorie.riferimenti_normativi,
    blocchi: datiCategorie.blocchi_comuni,
    includiRiferimentiNonVerificati: config.lettera.includiRiferimentiNonVerificati,
    categorie: cats.map(({ faq, passi, intro, descrizione_meta, note, ...resto }) => resto),
    fornitori: fornitori
      .filter((f) => slugCategorie.includes(f.categoria))
      .map((f) => ({
        slug: f.slug,
        nome: f.nome,
        categoria: f.categoria,
        recapiti: recapitiUtilizzabili(f),
        verificato: fornitoreVerificato(f),
        ultima_verifica: f.ultima_verifica,
      })),
  };
}

export type DatiGeneratore = ReturnType<typeof datiPerGeneratore>;
