// Composizione del testo della lettera a partire dai dati inseriti e dai testi in data/categorie.json.
// Funzione pura: gira interamente nel browser, nessun dato viene inviato a un server.

import type {
  BlocchiComuni,
  Categoria,
  RiferimentoNormativo,
  TipoRichiesta,
  TipoRichiestaId,
} from './types.ts';
import { dataLunga, slugify } from './format.ts';
import { formattaIban, normalizzaCodiceFiscale } from './validators.ts';

export type ModalitaInvio = 'raccomandata' | 'pec' | 'altro';

export interface DatiLettera {
  tipo: TipoRichiestaId;
  categoria: Categoria;
  tipi: TipoRichiesta[];
  blocchi: BlocchiComuni;
  riferimenti: Record<string, RiferimentoNormativo>;
  includiRiferimentiNonVerificati: boolean;
  motivazione: string;
  destinatario: { nome: string; indirizzo: string; cap: string; citta: string; provincia: string; pec: string };
  mittente: {
    nome: string;
    cognome: string;
    codiceFiscale: string;
    indirizzo: string;
    cap: string;
    citta: string;
    provincia: string;
    email: string;
    telefono: string;
  };
  codiceCliente: string;
  campi: Record<string, string>;
  /** Date in formato AAAA-MM-GG (vuote se non indicate). */
  dataContratto: string;
  dataLettera: string;
  dataDecorrenza: string;
  luogo: string;
  invio: ModalitaInvio;
  apparati: boolean;
  modalitaRestituzione: string;
  rimborso: boolean;
  iban: string;
  intestatarioIban: string;
  allegaDocumento: boolean;
  allegati: string[];
}

export interface LetteraGenerata {
  oggetto: string;
  testo: string;
  nomeFile: string;
}

/** Sostituisce i segnaposto {{nome}}; quelli sconosciuti diventano stringa vuota. */
export function compila(modello: string, valori: Record<string, string>): string {
  return modello.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, chiave: string) => valori[chiave] ?? '');
}

/** Rimuove spazi doppi e spazi prima della punteggiatura lasciati dai segnaposto vuoti. */
export function ripulisci(testo: string): string {
  return testo
    .split('\n')
    .map((riga) =>
      riga
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/ +([.,;:])/g, '$1')
        .replace(/,\./g, '.')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function riga(...parti: (string | undefined | false)[]): string {
  return parti.filter(Boolean).join(' ').trim();
}

function localita(cap: string, citta: string, provincia: string): string {
  const prov = provincia.trim() ? ` (${provincia.trim().toUpperCase()})` : '';
  return riga(cap.trim(), citta.trim()) + (citta.trim() ? prov : '');
}

function frase(testo: string): string {
  const t = testo.trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

export function identificativi(dati: Pick<DatiLettera, 'categoria' | 'codiceCliente' | 'campi'>): string[] {
  const elenco: string[] = [];
  if (dati.codiceCliente.trim()) elenco.push(`codice cliente/contratto ${dati.codiceCliente.trim()}`);
  for (const campo of dati.categoria.campi) {
    const valore = (dati.campi[campo.id] ?? '').trim();
    if (!valore || campo.identificativo === false) continue;
    const v = campo.id === 'targa' || campo.id === 'pod' ? valore.toUpperCase() : valore;
    elenco.push(`${campo.etichetta_lettera} ${v}`);
  }
  return elenco;
}

export function riferimentoNormativo(dati: Pick<DatiLettera, 'categoria' | 'tipo' | 'riferimenti' | 'includiRiferimentiNonVerificati'>): RiferimentoNormativo | null {
  const id = dati.categoria.riferimenti[dati.tipo];
  if (!id) return null;
  const rif = dati.riferimenti[id];
  if (!rif || !rif.testo.trim()) return null;
  if (!rif.verificato && !dati.includiRiferimentiNonVerificati) return null;
  return rif;
}

export function generaLettera(dati: DatiLettera): LetteraGenerata {
  const { categoria, blocchi, mittente: m, destinatario: d } = dati;
  const tipo = dati.tipi.find((t) => t.id === dati.tipo);
  if (!tipo) throw new Error(`Tipo di richiesta sconosciuto: ${dati.tipo}`);

  const nomeCompleto = riga(m.nome, m.cognome);
  const ids = identificativi(dati);
  const rif = riferimentoNormativo(dati);
  const motivazione = dati.motivazione.trim();

  const valori: Record<string, string> = {
    fornitore: d.nome.trim(),
    nome_completo: nomeCompleto,
    codice_fiscale: normalizzaCodiceFiscale(m.codiceFiscale),
    tipo_contratto: categoria.tipo_contratto,
    identificativi: ids.length ? ` (${ids.join('; ')})` : '',
    data_contratto: dati.dataContratto ? `, concluso in data ${dataLunga(dati.dataContratto)}` : '',
    decorrenza: dati.dataDecorrenza ? `a partire dal ${dataLunga(dati.dataDecorrenza)}` : tipo.decorrenza_predefinita,
    motivazione: motivazione ? frase(`Motivo della richiesta: ${motivazione.charAt(0).toLowerCase()}${motivazione.slice(1)}`) : '',
    riferimento_normativo: rif ? ` ${rif.testo.trim()}` : '',
    rif_oggetto: ids.length ? ` – ${ids[0]}` : '',
  };

  const oggetto = ripulisci(compila(categoria.lettera.oggetto[dati.tipo], valori));
  const corpo = ripulisci(compila(categoria.lettera.corpo[dati.tipo], valori));

  const paragrafi: string[] = [corpo];
  if (dati.apparati && categoria.apparati) {
    paragrafi.push(compila(blocchi.apparati, { modalita_restituzione: dati.modalitaRestituzione || 'da concordare' }));
  }
  if (dati.rimborso) {
    const iban = dati.iban.trim()
      ? compila(blocchi.rimborso_iban, {
          iban: formattaIban(dati.iban),
          intestatario_iban: dati.intestatarioIban.trim() || nomeCompleto,
        })
      : '';
    paragrafi.push(compila(blocchi.rimborso, { iban }));
  }
  paragrafi.push(blocchi.conferma);

  const allegati = [
    ...(dati.allegaDocumento ? [blocchi.allegato_documento] : []),
    ...dati.allegati.map((a) => a.trim()).filter(Boolean),
  ];

  const righe: string[] = [
    nomeCompleto,
    m.indirizzo.trim(),
    localita(m.cap, m.citta, m.provincia),
    `C.F. ${normalizzaCodiceFiscale(m.codiceFiscale)}`,
  ];
  if (m.email.trim()) righe.push(`Email: ${m.email.trim()}`);
  if (m.telefono.trim()) righe.push(`Tel.: ${m.telefono.trim()}`);
  righe.push('');

  const invio = blocchi.invio[dati.invio];
  if (invio) righe.push(invio, '');

  righe.push('Spett.le', d.nome.trim());
  if (d.indirizzo.trim()) righe.push(d.indirizzo.trim());
  const locDest = localita(d.cap, d.citta, d.provincia);
  if (locDest) righe.push(locDest);
  if (d.pec.trim()) righe.push(`PEC: ${d.pec.trim()}`);
  righe.push('');

  const data = dataLunga(dati.dataLettera);
  righe.push(dati.luogo.trim() ? `${dati.luogo.trim()}, ${data}` : data, '');
  righe.push(`Oggetto: ${oggetto}`, '');

  for (const p of paragrafi) righe.push(ripulisci(p), '');
  righe.push(blocchi.saluti, '');

  if (allegati.length) {
    righe.push('Allegati:', ...allegati.map((a) => `- ${a}`), '');
  }

  righe.push('Firma', '', '______________________________', nomeCompleto);

  const testo = ripulisci(righe.join('\n'));
  const nomeFile = `${slugify(`${tipo.id === 'disdetta_scadenza' ? 'disdetta' : 'recesso'}-${d.nome}`) || 'lettera'}-${dati.dataLettera}`;

  return { oggetto, testo, nomeFile };
}
