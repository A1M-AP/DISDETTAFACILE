// =============================================================================
// Configurazione unica del sito DisdettaFacile.it
// -----------------------------------------------------------------------------
// Qui si modificano: dati del sito e del titolare, link di affiliazione,
// spazi pubblicitari, opzioni SEO e cookie. Non serve toccare il codice.
// I campi lasciati vuoti ('') non vengono mostrati nelle pagine.
// =============================================================================

/** @type {import('./src/lib/types').ConfigSito} */
const config = {
  nome: 'DisdettaFacile.it',
  // URL di produzione, senza slash finale. Usato per canonici, sitemap e Open Graph.
  url: 'https://disdettafacile.it',
  descrizione:
    'Crea gratis la lettera di disdetta o recesso per telefonia, pay TV, palestre, assicurazioni, luce e gas e abbonamenti. I dati restano nel tuo browser.',

  // Dati del titolare del sito (mostrati in privacy policy, note legali, contatti e footer).
  // Sede legale e partita IVA vanno aggiunte appena disponibili: per un'attività con
  // partita IVA l'indicazione sul sito è obbligatoria. Finché sono vuote non vengono mostrate.
  titolare: {
    nome: 'MAP TECHNOLOGIES',
    indirizzo: '',
    partitaIva: '',
    // Casella da creare sul dominio (es. con Cloudflare Email Routing, gratuito).
    email: 'info@disdettafacile.it',
  },

  seo: {
    // Immagine Open Graph predefinita (percorso in /public).
    immagineOg: '/og-default.png',
    // Le pagine dei fornitori con dati non ancora verificati (ultima_verifica = null)
    // vengono generate con "noindex" ed escluse dalla sitemap finché questo valore è false.
    indicizzaFornitoriNonVerificati: false,
  },

  lettera: {
    // Se false, i riferimenti normativi con "verificato": false in data/categorie.json
    // NON vengono inseriti nelle lettere. Impostare a false finché un professionista
    // non ha revisionato i testi, oppure marcare i riferimenti come verificati.
    includiRiferimentiNonVerificati: true,
  },

  // ---------------------------------------------------------------------------
  // Affiliazioni: servizi di invio raccomandata online e PEC.
  // Sostituire "url" con i link di affiliazione reali. Le voci con attivo: false
  // non vengono mostrate. I link sono sempre marcati rel="sponsored nofollow".
  // ---------------------------------------------------------------------------
  affiliazioni: {
    disclosure:
      'Alcuni link sono di affiliazione: se acquisti un servizio tramite questi link potremmo ricevere una commissione, senza costi aggiuntivi per te. Questo non influisce sui contenuti né sui modelli di lettera.',
    servizi: [
      {
        id: 'raccomandata-online',
        tipo: 'raccomandata',
        nome: 'Servizio di raccomandata online (segnaposto)',
        descrizione: 'Invia la raccomandata A/R dal computer o dallo smartphone, senza andare all’ufficio postale.',
        // Inserire il link di affiliazione (https://...). Finché non è un URL valido il servizio non viene mostrato.
        url: '',
        etichettaPulsante: 'Invia la raccomandata online',
        attivo: true,
      },
      {
        id: 'pec',
        tipo: 'pec',
        nome: 'Fornitore di casella PEC (segnaposto)',
        descrizione: 'Attiva una casella di Posta Elettronica Certificata per inviare la disdetta con valore legale.',
        url: '',
        etichettaPulsante: 'Attiva una PEC',
        attivo: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Pubblicità: spazi segnaposto con altezza riservata (nessuno spostamento del
  // layout). Gli spazi non sono mai inseriti all'interno del modulo.
  // Per attivare un circuito pubblicitario vedere src/scripts/ads.ts.
  // ---------------------------------------------------------------------------
  pubblicita: {
    // Disattivata finché non è configurato un circuito pubblicitario: con true compaiono
    // gli spazi riservati nelle pagine (vedi src/scripts/ads.ts).
    attiva: false,
    // Mostra un riquadro tratteggiato "Spazio pubblicitario" (utile in sviluppo).
    mostraSegnaposto: false,
    // Altezza minima riservata per ogni spazio, in pixel (mobile / desktop).
    altezzaMobile: 280,
    altezzaDesktop: 250,
  },

  cookie: {
    // Incrementare quando cambiano finalità o terze parti: il banner verrà
    // mostrato di nuovo a tutti gli utenti.
    versione: 1,
    // Dopo quanti mesi riproporre il banner a chi ha rifiutato o chiuso.
    durataMesi: 6,
  },
};

export default config;
