# DisdettaFacile.it

Titolare: **MAP TECHNOLOGIES**. Sito statico, veloce e mobile-first, in italiano, che genera lettere di **disdetta e recesso** personalizzate per contratti di consumo (telefonia e internet, pay TV e streaming, palestre, assicurazioni, luce e gas, riviste e altri abbonamenti).

- La lettera viene generata **interamente nel browser**: i dati inseriti nel modulo non vengono mai inviati né salvati su un server.
- Esportazione in **PDF** (jsPDF), **Word/DOCX** (docx) e copia del testo. Le librerie vengono caricate solo quando l'utente clicca su "Scarica".
- Costruito con [Astro](https://astro.build) (output statico), senza framework client e senza font esterni.
- Lighthouse mobile misurato in sviluppo: 100 su performance, accessibilità, best practice e SEO (le pagine dei fornitori non verificati hanno SEO più basso perché sono volutamente in `noindex`).

---

## Avvio rapido

Requisiti: **Node.js 22.18 o successivo** (serve per eseguire i file `.ts` di test e degli script).

```bash
npm install
npm run dev          # sviluppo su http://localhost:4321
npm run build        # genera il sito statico in dist/
npm run preview      # anteprima della build
```

Controlli:

```bash
npm test                   # test di validatori (codice fiscale, IBAN…) e composizione della lettera
npm run check              # controllo dei tipi TypeScript/Astro
npm run check:data         # verifica i file dati ed elenca ciò che è ancora "DA VERIFICARE"
npm run check:data:strict  # come sopra, ma fallisce se resta qualcosa da verificare (da usare prima della pubblicazione)
```

Anche la build fallisce se i file dati sono incoerenti (slug duplicati, categoria inesistente, testi mancanti, segnaposto sconosciuti…).

---

## Struttura

```
site.config.mjs              ← configurazione unica: dati del sito e del titolare, affiliazioni, pubblicità, SEO, cookie
data/
  categorie.json             ← testi delle lettere, campi, motivazioni, riferimenti normativi, note, passi, FAQ
  fornitori.json             ← fornitori: recapiti, PEC, canali alternativi, data dell'ultima verifica, fonte
src/
  pages/
    index.astro                          → /
    disdetta/index.astro                 → /disdetta/ (elenco completo)
    disdetta/[categoria]/index.astro     → /disdetta/<categoria>/
    disdetta/[categoria]/[fornitore].astro → /disdetta/<categoria>/<fornitore>/ (una pagina per fornitore in fornitori.json)
    recesso-14-giorni.astro, come-inviare-una-disdetta.astro
    chi-siamo, contatti, privacy-policy, cookie-policy, note-legali, 404
    sitemap.xml.ts, robots.txt.ts         → generati automaticamente
  components/Generator.astro  ← modulo guidato in 5 passaggi
  scripts/generator.ts        ← logica del modulo (validazione, ricerca fornitore, anteprima, bozza locale)
  scripts/export-pdf.ts, export-docx.ts ← esportazioni (caricate su richiesta)
  scripts/consenso.ts         ← banner cookie / consenso
  scripts/ads.ts              ← punto di integrazione per il circuito pubblicitario
  lib/letter.ts               ← composizione del testo della lettera (funzione pura, testata)
  lib/validators.ts           ← codice fiscale, IBAN, CAP, email…
  lib/data-validate.ts        ← controlli di coerenza dei file dati
tests/                        ← test con node:test
public/_headers               ← intestazioni HTTP (sicurezza e cache) per Cloudflare Pages
wrangler.toml                 ← configurazione Cloudflare Pages
```

---

## Il generatore

1. **Tipo di richiesta**: disdetta alla scadenza, recesso anticipato, recesso entro 14 giorni, trasloco, altra motivazione (con motivazioni selezionabili per categoria).
2. **Destinatario**: ricerca con completamento automatico (accessibile da tastiera) tra i fornitori della categoria, oppure inserimento manuale. I recapiti marcati "DA VERIFICARE" non vengono mai inseriti nella lettera: l'utente deve compilarli.
3. **Intestatario**: nome, cognome, codice fiscale (con controllo del carattere finale), indirizzo, codice cliente/contratto e i campi specifici della categoria (numero di linea, polizza, targa, POD/PDR…).
4. **Opzioni**: modalità di invio, luogo e data, decorrenza, restituzione apparati e modalità, rimborso del credito residuo con IBAN facoltativo (validato), allegati (documento d'identità come promemoria e allegati suggeriti per categoria).
5. **Anteprima modificabile**, poi PDF, DOCX o copia. Dopo la generazione compare il box "Come inviarla" con istruzioni e link di affiliazione.

La **bozza** si salva solo se l'utente lo sceglie, in `localStorage` sul suo dispositivo, e **senza IBAN**.

---

## Aggiungere o modificare una categoria

Modifica `data/categorie.json`, array `categorie`. Ogni categoria ha:

| Campo | Descrizione |
|---|---|
| `slug` | parte dell'URL (`/disdetta/<slug>/`), solo minuscole, numeri e trattini |
| `nome`, `nome_breve` | nome visualizzato e versione usata nelle frasi ("Disdetta *palestre*") |
| `tipo_contratto` | completa la frase "titolare del contratto …" nella lettera |
| `descrizione_meta`, `intro` | meta description e testo esplicativo della pagina |
| `campi` | campi specifici del modulo: `id`, `etichetta`, `etichetta_lettera` (come compare nella lettera), `obbligatorio`, `placeholder`, `aiuto`, `pattern` + `messaggio_errore` (validazione), `tipo` (`text`/`email`), `identificativo` |
| `motivazioni` | motivazioni selezionabili |
| `apparati` | `true` per mostrare l'opzione di restituzione di modem/decoder |
| `allegati_suggeriti` | caselle di allegati proposte al passo 4 |
| `lettera.oggetto` / `lettera.corpo` | testo per **ognuno** dei 5 tipi di richiesta |
| `riferimenti` | associa un tipo di richiesta a un id di `riferimenti_normativi` |
| `note`, `passi`, `faq` | contenuti della pagina (le FAQ generano il markup schema.org `FAQPage`) |

La pagina della categoria viene creata automaticamente alla build successiva.

### Segnaposto nei testi della lettera

| Segnaposto | Diventa |
|---|---|
| `{{nome_completo}}`, `{{codice_fiscale}}` | dati dell'intestatario |
| `{{fornitore}}` | nome del destinatario |
| `{{tipo_contratto}}` | il campo `tipo_contratto` della categoria |
| `{{identificativi}}` | ` (codice cliente/contratto 123; numero di linea …)` oppure vuoto |
| `{{data_contratto}}` | `, concluso in data 1 settembre 2026` oppure vuoto |
| `{{decorrenza}}` | `a partire dal …` oppure la `decorrenza_predefinita` del tipo di richiesta |
| `{{motivazione}}` | frase `Motivo della richiesta: …` oppure vuoto |
| `{{riferimento_normativo}}` | ` ai sensi …` (vedi sotto) oppure vuoto |
| `{{rif_oggetto}}` | ` – <primo identificativo>` nell'oggetto |

I blocchi comuni (apparati, rimborso, conferma, saluti, allegato documento, riga di invio) sono in `blocchi_comuni` e valgono per tutte le categorie.

### Riferimenti normativi

I riferimenti normativi **non sono scritti nel codice**: stanno in `riferimenti_normativi` di `data/categorie.json`, ognuno con `testo`, `verificato` e `note_revisione`, così possono essere revisionati da un professionista in un unico punto.

- Finché `verificato` è `false`, `npm run check:data` li segnala.
- In `site.config.mjs`, `lettera.includiRiferimentiNonVerificati: false` esclude dalle lettere tutti i riferimenti non ancora verificati.
- Dopo la revisione impostare `"verificato": true`.

---

## Aggiungere un fornitore

Aggiungi un oggetto in `data/fornitori.json`:

```json
{
  "slug": "nome-fornitore",
  "nome": "Nome Fornitore",
  "categoria": "telefonia-internet",
  "descrizione": "Breve descrizione neutra del servizio.",
  "recapiti": {
    "destinatario": "Ragione sociale per le disdette",
    "indirizzo": "Via/Casella postale",
    "cap": "00100",
    "citta": "Città",
    "provincia": "RM",
    "pec": "indirizzo@pec.esempio.it"
  },
  "canali_alternativi": [
    { "tipo": "area_clienti", "etichetta": "Area clienti", "descrizione": "Come richiedere la disdetta online", "url": "https://…" }
  ],
  "note": ["Indicazioni specifiche, con fonte"],
  "faq": [{ "domanda": "…", "risposta": "…" }],
  "ultima_verifica": "2026-10-01",
  "fonte": "Condizioni generali di contratto, versione …, link …"
}
```

Regole importanti:

- **Non inventare** indirizzi, PEC, termini di preavviso o riferimenti normativi. Usa solo fonti ufficiali e indica la `fonte`.
- Un valore vuoto o contenente `DA VERIFICARE` è trattato come mancante: non viene inserito nella lettera e la pagina lo mostra come "DA VERIFICARE".
- `ultima_verifica` (`AAAA-MM-GG`) è mostrata in pagina. Se è `null`, la pagina del fornitore viene generata con `noindex` ed esclusa dalla sitemap (modificabile con `seo.indicizzaFornitoriNonVerificati` in `site.config.mjs`).
- Le pagine sono generate **solo** per i fornitori presenti nel file. Ogni pagina ha contenuti specifici (recapiti, canali, note, FAQ costruite dai dati). Evita di aggiungere fornitori senza dati verificati: produrrebbero pagine poco utili.

I fornitori inclusi ora sono **esempi segnaposto** con tutti i recapiti `DA VERIFICARE`.

---

## Aggiornare i testi del sito

- **Testi delle lettere, FAQ, note e passi per categoria**: `data/categorie.json`.
- **Testi dei fornitori**: `data/fornitori.json`.
- **Homepage, guide e pagine legali**: i file in `src/pages/`.
- **Disclaimer presente in ogni pagina**: `src/components/Disclaimer.astro`.
- **Box "Come inviarla"**: `src/components/ComeInviarla.astro`.

## Monetizzazione

Tutto si configura in `site.config.mjs`:

- `affiliazioni.servizi`: nome, descrizione, `url` di affiliazione, testo del pulsante, `attivo`. Un servizio compare sul sito solo quando `url` è un link reale (`https://…`): oggi gli `url` sono vuoti, quindi box e sezioni di affiliazione restano nascosti finché non inserisci i link. I link hanno sempre `rel="sponsored nofollow noopener"` e sono accompagnati dalla `disclosure` (mostrata anche nel footer di ogni pagina).
- `pubblicita`: oggi `attiva: false` (nessuno spazio visibile finché non scegli un circuito). Con `attiva: true` compaiono gli spazi segnaposto con altezza minima riservata (nessuno spostamento del layout), mai all'interno del modulo. Per collegare un circuito pubblicitario segui le istruzioni in `src/scripts/ads.ts`: gli script di terze parti vanno caricati **solo dopo il consenso** "marketing" (evento `df:consenso`). Aggiorna poi la cookie policy e incrementa `cookie.versione` per riproporre il banner.

## Privacy e cookie

- Banner conforme alle Linee guida del Garante (giugno 2021): chiusura con la X = solo strumenti tecnici; "Rifiuta" e "Accetta tutti" con pari evidenza; scelta per finalità; preferenze riapribili dal footer; scelta ricordata per `cookie.durataMesi` mesi.
- Privacy policy: dichiara che i dati del generatore restano nel browser.
- Nessuna chiamata di rete con i dati dell'utente (verificato con test end-to-end: zero richieste esterne e zero POST durante l'uso del generatore).

---

## Pubblicazione su Cloudflare Pages

Il progetto è pronto per Cloudflare Pages: sito statico in `dist/`, intestazioni in `public/_headers`, pagina `404.html`, versione di Node in `.nvmrc`.

### Collegamento al repository (consigliato)

1. Dashboard Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** e scegli questo repository, branch di produzione `main`.
2. Impostazioni di build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variabile d'ambiente (facoltativa, `.nvmrc` è già letto): `NODE_VERSION` = `22`
3. **Custom domains** → aggiungi `disdettafacile.it` (e `www.disdettafacile.it`). Se il dominio è già su Cloudflare i record DNS vengono creati in automatico.
4. Reindirizza `www` al dominio principale con una regola **Redirect Rules** / **Bulk Redirects** (`https://www.disdettafacile.it/*` → `https://disdettafacile.it/${1}`, 301): l'URL canonico usato da sitemap e meta tag è `https://disdettafacile.it`.
5. Crea la casella `info@disdettafacile.it` (ad esempio con **Email Routing** di Cloudflare, che inoltra gratis a un tuo indirizzo).

Ogni push su `main` pubblica il sito; gli altri branch generano anteprime.

Impostazioni Cloudflare consigliate: lascia **disattivati** Rocket Loader e Web Analytics automatico (inietterebbero script; se vuoi le statistiche aggiornale prima nella cookie policy). Se attivi la protezione dai bot, Cloudflare può impostare cookie tecnici già indicati nella cookie policy.

### Deploy da terminale (alternativa)

```bash
npx wrangler login
npm run deploy      # build + wrangler pages deploy dist
```

### Cose da completare

1. **Sede legale e partita IVA** di MAP TECHNOLOGIES in `site.config.mjs` (`titolare.indirizzo`, `titolare.partitaIva`): per un'attività con partita IVA vanno indicate sul sito. Finché sono vuote non vengono mostrate.
2. Link di affiliazione reali in `affiliazioni.servizi[].url`; circuito pubblicitario quando disponibile (`pubblicita.attiva`, `src/scripts/ads.ts`, cookie policy, `cookie.versione`).
3. Far revisionare a un professionista i testi delle lettere e i `riferimenti_normativi`, poi impostarli `verificato: true` (oppure `lettera.includiRiferimentiNonVerificati: false`).
4. Verificare i recapiti dei fornitori sulle fonti ufficiali e compilare `ultima_verifica` e `fonte`: solo allora le loro pagine entrano in sitemap e vengono indicizzate.
5. Prima di ogni rilascio importante: `npm run check:data:strict && npm test && npm run build`.
