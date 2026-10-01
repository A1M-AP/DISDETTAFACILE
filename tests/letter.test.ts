import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { DatiCategorie, DatiFornitori } from '../src/lib/types.ts';
import { generaLettera, type DatiLettera } from '../src/lib/letter.ts';
import { verificaDati } from '../src/lib/data-validate.ts';

const cat: DatiCategorie = JSON.parse(readFileSync(new URL('../data/categorie.json', import.meta.url), 'utf8'));
const forn: DatiFornitori = JSON.parse(readFileSync(new URL('../data/fornitori.json', import.meta.url), 'utf8'));

function base(over: Partial<DatiLettera> = {}): DatiLettera {
  return {
    tipo: 'recesso_anticipato',
    categoria: cat.categorie.find((c) => c.slug === 'telefonia-internet')!,
    tipi: cat.tipi_richiesta,
    blocchi: cat.blocchi_comuni,
    riferimenti: cat.riferimenti_normativi,
    includiRiferimentiNonVerificati: true,
    motivazione: '',
    destinatario: { nome: 'Operatore Esempio S.p.A.', indirizzo: 'Casella Postale 1', cap: '00100', citta: 'Roma', provincia: 'rm', pec: '' },
    mittente: {
      nome: 'Mario', cognome: 'Rossi', codiceFiscale: 'rssmra80a01h501u', indirizzo: 'Via Roma 1',
      cap: '20100', citta: 'Milano', provincia: 'MI', email: '', telefono: '',
    },
    codiceCliente: '123456',
    campi: { numero_linea: '02 1234567' },
    dataContratto: '',
    dataLettera: '2026-10-01',
    dataDecorrenza: '',
    luogo: 'Milano',
    invio: 'raccomandata',
    apparati: false,
    modalitaRestituzione: '',
    rimborso: false,
    iban: '',
    intestatarioIban: '',
    allegaDocumento: true,
    allegati: [],
    ...over,
  };
}

test('i file dati sono coerenti', () => {
  const esito = verificaDati(cat, forn);
  assert.deepEqual(esito.errori, []);
});

test('la lettera contiene tutte le parti richieste', () => {
  const { testo, oggetto, nomeFile } = generaLettera(base());
  assert.match(testo, /^Mario Rossi\nVia Roma 1\n20100 Milano \(MI\)\nC\.F\. RSSMRA80A01H501U/);
  assert.match(testo, /Inviata a mezzo raccomandata A\/R\n\nSpett\.le\nOperatore Esempio S\.p\.A\.\nCasella Postale 1\n00100 Roma \(RM\)/);
  assert.match(testo, /\nMilano, 1 ottobre 2026\n/);
  assert.equal(oggetto, 'Recesso dal contratto di telefonia/internet – codice cliente/contratto 123456');
  assert.match(testo, /\(codice cliente\/contratto 123456; numero di linea 02 1234567\), comunico/);
  assert.match(testo, /ai sensi dell'art\. 1, comma 3, del D\.L\. 31 gennaio 2007/);
  assert.match(testo, /Allegati:\n- Copia del documento d'identità/);
  assert.match(testo, /Firma\n\n_+\nMario Rossi$/);
  assert.equal(nomeFile, 'recesso-operatore-esempio-s-p-a-2026-10-01');
  assert.doesNotMatch(testo, /\{\{|undefined| ,| \./);
});

test('i riferimenti non verificati si possono escludere', () => {
  const { testo } = generaLettera(base({ includiRiferimentiNonVerificati: false }));
  assert.doesNotMatch(testo, /ai sensi/);
  assert.match(testo, /recedere dal contratto prima della sua scadenza\./);
});

test('opzioni: decorrenza, motivazione, apparati, rimborso con IBAN, allegati', () => {
  const { testo } = generaLettera(
    base({
      tipo: 'disdetta_scadenza',
      dataDecorrenza: '2026-12-31',
      dataContratto: '2025-01-15',
      motivazione: 'Passaggio ad altro operatore',
      apparati: true,
      modalitaRestituzione: 'ritiro a domicilio a vostra cura',
      rimborso: true,
      iban: 'it60x0542811101000000123456',
      allegati: ["Copia dell'ultima fattura"],
      invio: 'pec',
      destinatario: { nome: 'Operatore', indirizzo: '', cap: '', citta: '', provincia: '', pec: 'disdette@pec.esempio.it' },
    }),
  );
  assert.match(testo, /cessi a partire dal 31 dicembre 2026/);
  assert.match(testo, /, concluso in data 15 gennaio 2025, comunico/);
  assert.match(testo, /Motivo della richiesta: passaggio ad altro operatore\./);
  assert.match(testo, /Modalità di restituzione preferita: ritiro a domicilio a vostra cura\./);
  assert.match(testo, /IBAN IT60 X054 2811 1010 0000 0123 456 intestato a Mario Rossi\./);
  assert.match(testo, /Inviata a mezzo PEC\n\nSpett\.le\nOperatore\nPEC: disdette@pec\.esempio\.it\n/);
  assert.match(testo, /- Copia dell'ultima fattura/);
  assert.doesNotMatch(testo, /ai sensi/); // nessun riferimento per la disdetta alla scadenza
});

test('ogni categoria e ogni tipo producono una lettera pulita', () => {
  for (const categoria of cat.categorie) {
    for (const t of cat.tipi_richiesta) {
      const { testo } = generaLettera(base({ categoria, tipo: t.id, campi: {}, motivazione: 'altro motivo' }));
      assert.doesNotMatch(testo, /\{\{|undefined|  | ,| \.|\.\./, `${categoria.slug}/${t.id}`);
    }
  }
});
