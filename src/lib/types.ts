// Tipi condivisi tra pagine, generatore e script di verifica dei dati.

export type TipoRichiestaId =
  | 'disdetta_scadenza'
  | 'recesso_anticipato'
  | 'recesso_14_giorni'
  | 'trasloco'
  | 'altro';

export interface TipoRichiesta {
  id: TipoRichiestaId;
  etichetta: string;
  descrizione: string;
  /** Usata nella lettera quando l'utente non indica una data di decorrenza. */
  decorrenza_predefinita: string;
}

export interface RiferimentoNormativo {
  /** Testo inserito nella lettera, es. "ai sensi dell'art. ...". */
  testo: string;
  verificato: boolean;
  note_revisione?: string;
}

export interface CampoCategoria {
  id: string;
  etichetta: string;
  /** Come il dato viene citato nel testo della lettera. */
  etichetta_lettera: string;
  obbligatorio?: boolean;
  placeholder?: string;
  aiuto?: string;
  /** Espressione regolare (senza delimitatori) per una validazione leggera. */
  pattern?: string;
  messaggio_errore?: string;
  tipo?: 'text' | 'email';
  /** Il campo identifica il contratto (va nell'elenco identificativi). Default true. */
  identificativo?: boolean;
}

export interface Faq {
  domanda: string;
  risposta: string;
}

export interface LetteraCategoria {
  oggetto: Record<TipoRichiestaId, string>;
  corpo: Record<TipoRichiestaId, string>;
}

export interface Categoria {
  slug: string;
  nome: string;
  nome_breve: string;
  /** Usato in "titolare del contratto {{tipo_contratto}}". */
  tipo_contratto: string;
  descrizione_meta: string;
  intro: string[];
  campi: CampoCategoria[];
  motivazioni: string[];
  /** Mostra l'opzione di restituzione degli apparati (modem, decoder...). */
  apparati: boolean;
  allegati_suggeriti: string[];
  lettera: LetteraCategoria;
  /** Associa un tipo di richiesta a un id di riferimenti_normativi. */
  riferimenti: Partial<Record<TipoRichiestaId, string>>;
  note: string[];
  passi: string[];
  faq: Faq[];
}

export interface BlocchiComuni {
  apparati: string;
  modalita_restituzione: string[];
  rimborso: string;
  rimborso_iban: string;
  conferma: string;
  saluti: string;
  allegato_documento: string;
  invio: Record<'raccomandata' | 'pec' | 'altro', string>;
}

export interface DatiCategorie {
  versione_testi: string;
  tipi_richiesta: TipoRichiesta[];
  riferimenti_normativi: Record<string, RiferimentoNormativo>;
  blocchi_comuni: BlocchiComuni;
  categorie: Categoria[];
}

export interface Recapiti {
  destinatario: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  pec: string;
}

export interface CanaleAlternativo {
  tipo: 'area_clienti' | 'modulo_online' | 'telefono' | 'negozio' | 'app' | 'altro';
  etichetta: string;
  descrizione: string;
  url?: string;
}

export interface Fornitore {
  slug: string;
  nome: string;
  categoria: string;
  descrizione: string;
  recapiti: Recapiti;
  canali_alternativi: CanaleAlternativo[];
  note: string[];
  faq: Faq[];
  /** Data ISO (AAAA-MM-GG) dell'ultima verifica dei dati, oppure null. */
  ultima_verifica: string | null;
  fonte: string;
}

export interface DatiFornitori {
  fornitori: Fornitore[];
}

export interface ServizioAffiliato {
  id: string;
  tipo: 'raccomandata' | 'pec' | 'altro';
  nome: string;
  descrizione: string;
  url: string;
  etichettaPulsante: string;
  attivo: boolean;
}

export interface ConfigSito {
  nome: string;
  url: string;
  descrizione: string;
  titolare: { nome: string; indirizzo: string; partitaIva: string; email: string };
  seo: { immagineOg: string; indicizzaFornitoriNonVerificati: boolean };
  lettera: { includiRiferimentiNonVerificati: boolean };
  affiliazioni: { disclosure: string; servizi: ServizioAffiliato[] };
  pubblicita: { attiva: boolean; mostraSegnaposto: boolean; altezzaMobile: number; altezzaDesktop: number };
  cookie: { versione: number; durataMesi: number };
}
