// Controlli di coerenza sui file dati. Usati dalla build (errori bloccanti)
// e da `npm run check:data` (riepilogo dei dati ancora da verificare).

import type { DatiCategorie, DatiFornitori, TipoRichiestaId } from './types.ts';
import { daVerificare } from './format.ts';
import { dataIsoValida } from './validators.ts';

export const TIPI_RICHIESTA: TipoRichiestaId[] = [
  'disdetta_scadenza',
  'recesso_anticipato',
  'recesso_14_giorni',
  'trasloco',
  'altro',
];

const SEGNAPOSTO_LETTERA = new Set([
  'fornitore', 'nome_completo', 'codice_fiscale', 'tipo_contratto', 'identificativi',
  'data_contratto', 'decorrenza', 'motivazione', 'riferimento_normativo', 'rif_oggetto',
]);

const CAMPI_RISERVATI = new Set([
  'nome', 'cognome', 'codice_fiscale', 'indirizzo', 'cap', 'citta', 'provincia', 'email',
  'telefono', 'codice_cliente', 'tipo', 'categoria', 'motivazione', 'iban',
]);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface EsitoVerifica {
  errori: string[];
  avvisi: string[];
}

function segnapostoUsati(testo: string): string[] {
  return [...testo.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
}

export function verificaDati(cat: DatiCategorie, forn: DatiFornitori): EsitoVerifica {
  const errori: string[] = [];
  const avvisi: string[] = [];

  const idTipi = cat.tipi_richiesta.map((t) => t.id);
  for (const t of TIPI_RICHIESTA) {
    if (!idTipi.includes(t)) errori.push(`categorie.json: manca il tipo di richiesta "${t}".`);
  }

  for (const [id, rif] of Object.entries(cat.riferimenti_normativi)) {
    if (!rif.testo?.trim()) errori.push(`categorie.json: il riferimento normativo "${id}" non ha testo.`);
    if (!rif.verificato) avvisi.push(`Riferimento normativo "${id}" non ancora verificato da un professionista.`);
  }

  const slugCategorie = new Set<string>();
  for (const c of cat.categorie) {
    const dove = `categorie.json › ${c.slug || '(senza slug)'}`;
    if (!SLUG.test(c.slug)) errori.push(`${dove}: slug non valido (solo minuscole, numeri e trattini).`);
    if (slugCategorie.has(c.slug)) errori.push(`${dove}: slug duplicato.`);
    slugCategorie.add(c.slug);
    if (!c.nome?.trim()) errori.push(`${dove}: nome mancante.`);
    if (!c.descrizione_meta?.trim()) errori.push(`${dove}: descrizione_meta mancante.`);
    if (!c.intro?.length) errori.push(`${dove}: testo introduttivo mancante.`);
    if (!c.faq?.length) avvisi.push(`${dove}: nessuna FAQ.`);

    for (const t of TIPI_RICHIESTA) {
      for (const parte of ['oggetto', 'corpo'] as const) {
        const testo = c.lettera?.[parte]?.[t];
        if (!testo?.trim()) {
          errori.push(`${dove}: manca lettera.${parte}.${t}.`);
          continue;
        }
        for (const s of segnapostoUsati(testo)) {
          if (!SEGNAPOSTO_LETTERA.has(s)) errori.push(`${dove}: segnaposto sconosciuto {{${s}}} in lettera.${parte}.${t}.`);
        }
      }
    }
    for (const [t, id] of Object.entries(c.riferimenti ?? {})) {
      if (!TIPI_RICHIESTA.includes(t as TipoRichiestaId)) errori.push(`${dove}: tipo "${t}" sconosciuto in riferimenti.`);
      if (id && !cat.riferimenti_normativi[id]) errori.push(`${dove}: riferimento normativo "${id}" inesistente.`);
    }
    const idCampi = new Set<string>();
    for (const campo of c.campi) {
      if (!/^[a-z][a-z0-9_]*$/.test(campo.id)) errori.push(`${dove}: id campo "${campo.id}" non valido.`);
      if (CAMPI_RISERVATI.has(campo.id)) errori.push(`${dove}: l'id campo "${campo.id}" è riservato.`);
      if (idCampi.has(campo.id)) errori.push(`${dove}: campo "${campo.id}" duplicato.`);
      idCampi.add(campo.id);
      if (campo.pattern) {
        try {
          new RegExp(campo.pattern);
        } catch {
          errori.push(`${dove}: pattern non valido per il campo "${campo.id}".`);
        }
      }
    }
  }

  const slugFornitori = new Set<string>();
  for (const f of forn.fornitori) {
    const dove = `fornitori.json › ${f.slug || '(senza slug)'}`;
    if (!SLUG.test(f.slug)) errori.push(`${dove}: slug non valido.`);
    if (slugFornitori.has(f.slug)) errori.push(`${dove}: slug duplicato.`);
    slugFornitori.add(f.slug);
    if (!f.nome?.trim()) errori.push(`${dove}: nome mancante.`);
    if (!slugCategorie.has(f.categoria)) errori.push(`${dove}: categoria "${f.categoria}" inesistente.`);
    if (f.ultima_verifica !== null && !dataIsoValida(f.ultima_verifica)) {
      errori.push(`${dove}: ultima_verifica deve essere una data AAAA-MM-GG oppure null.`);
    }
    const r = f.recapiti;
    if (f.ultima_verifica === null) {
      avvisi.push(`Fornitore "${f.nome}" con dati non verificati: pagina in noindex ed esclusa dalla sitemap (vedi seo.indicizzaFornitoriNonVerificati).`);
    } else {
      if (daVerificare(f.fonte)) errori.push(`${dove}: dati marcati come verificati ma senza fonte.`);
      if (daVerificare(r.pec) && (daVerificare(r.indirizzo) || daVerificare(r.citta))) {
        avvisi.push(`${dove}: verificato ma senza indirizzo né PEC per le disdette.`);
      }
      const testi = [...Object.values(r), ...f.note, ...f.canali_alternativi.map((c) => c.descrizione)];
      if (testi.some((t) => /DA\s+VERIFICARE/i.test(t))) {
        avvisi.push(`${dove}: verificato ma contiene ancora valori "DA VERIFICARE".`);
      }
    }
  }

  return { errori, avvisi };
}
