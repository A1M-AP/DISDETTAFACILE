// Logica del generatore nel browser: passaggi, validazione, ricerca del fornitore,
// anteprima modificabile, esportazione PDF/DOCX, copia e bozza locale.
// Nessuna richiesta di rete con i dati dell'utente: tutto resta sul dispositivo.

import type { DatiGeneratore } from '../lib/data.ts';
import type { Categoria, TipoRichiestaId } from '../lib/types.ts';
import { generaLettera, type DatiLettera, type ModalitaInvio } from '../lib/letter.ts';
import {
  capValido,
  codiceFiscaleValido,
  dataIsoValida,
  emailValida,
  ibanValido,
  provinciaValida,
} from '../lib/validators.ts';
import { oggiIso } from '../lib/format.ts';

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FornitoreGen = DatiGeneratore['fornitori'][number];
type CategoriaGen = DatiGeneratore['categorie'][number];
interface Errore {
  el: HTMLElement;
  msg: string;
  /** Elemento che riceve il messaggio, se diverso da `${el.id}-err`. */
  erroreId?: string;
}

const CHIAVE_BOZZA = 'df-bozza-v1';
const TOTALE_PASSI = 5;

function normalizza(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function giorniTra(daIso: string, aIso: string): number {
  const [a1, m1, g1] = daIso.split('-').map(Number);
  const [a2, m2, g2] = aIso.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, g2) - Date.UTC(a1, m1 - 1, g1)) / 86_400_000);
}

export function avviaGeneratore(root: HTMLElement) {
  const formTrovato = root.querySelector<HTMLFormElement>('#g-form');
  const datiEl = root.querySelector<HTMLScriptElement>('#g-dati');
  if (!formTrovato || !datiEl) return;
  const form: HTMLFormElement = formTrovato;
  const dati = JSON.parse(datiEl.textContent || '{}') as DatiGeneratore;
  const comeInviarla = document.getElementById('come-inviarla');

  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const campo = (nome: string) => form.elements.namedItem(nome) as Campo | RadioNodeList | null;
  const valore = (nome: string): string => {
    const c = campo(nome);
    if (!c) return '';
    if (c instanceof RadioNodeList) return c.value;
    if (c instanceof HTMLInputElement && c.type === 'checkbox') return c.checked ? 'on' : '';
    return c.disabled ? '' : c.value.trim();
  };
  const spuntato = (id: string) => !!$<HTMLInputElement>(`#${id}`)?.checked && !$<HTMLInputElement>(`#${id}`)?.disabled;

  const annuncio = $('#g-annuncio')!;
  const stato = $('#g-stato')!;
  const textarea = $<HTMLTextAreaElement>('#g-lettera')!;
  const avvisoAggiornata = $('#g-aggiornata')!;

  let passo = 1;
  let fornitoreScelto: FornitoreGen | null = null;
  let ultimaFirma = '';
  let ultimoTesto = '';
  let nomeFile = 'lettera';
  let testoModificato = false;

  // ---------------------------------------------------------------- categoria
  function categoriaCorrente(): CategoriaGen | null {
    const slug = valore('categoria');
    return dati.categorie.find((c) => c.slug === slug) ?? null;
  }

  function aggiornaCategoria(cambioUtente = false) {
    const cat = categoriaCorrente();
    $$<HTMLFieldSetElement>('[data-campi-cat]').forEach((fs) => {
      const attivo = !!cat && fs.dataset.campiCat === cat.slug;
      fs.hidden = !attivo;
      fs.disabled = !attivo;
    });
    const app = $<HTMLFieldSetElement>('[data-solo-apparati]');
    if (app) {
      app.hidden = !cat?.apparati;
      app.disabled = !cat?.apparati;
    }
    if (cambioUtente) {
      const sel = $<HTMLSelectElement>('#g-motivazione')!;
      const scelta = sel.value;
      sel.replaceChildren(
        new Option('Nessuna motivazione', ''),
        ...(cat?.motivazioni ?? []).map((m) => new Option(m, m)),
        new Option('Altro (la scrivo io)', '__altro'),
      );
      if ([...sel.options].some((o) => o.value === scelta)) sel.value = scelta;
      if (fornitoreScelto && cat && fornitoreScelto.categoria !== cat.slug) deselezionaFornitore();
    }
    aggiornaVisibilita();
  }

  function aggiornaVisibilita() {
    const tipo = valore('tipo') as TipoRichiestaId;
    const motivoLibero = valore('motivazione_scelta') === '__altro';
    mostra('motivazione-libera', motivoLibero);
    mostra('recesso-14', tipo === 'recesso_14_giorni');
    mostra('apparati', spuntato('g-apparati'));
    mostra('rimborso', spuntato('g-rimborso'));
    const label = $('#g-motivazione-label');
    if (label) {
      label.innerHTML =
        tipo === 'altro'
          ? 'Motivazione<span class="req" aria-hidden="true"> *</span>'
          : 'Motivazione <span class="hint-inline">(facoltativa)</span>';
    }
    $<HTMLSelectElement>('#g-motivazione')?.setAttribute('aria-required', String(tipo === 'altro'));
    const dc = $<HTMLInputElement>('#g-data-contratto');
    if (dc) dc.setAttribute('aria-required', String(tipo === 'recesso_14_giorni'));
    aggiornaAvviso14();
  }

  function mostra(chiave: string, si: boolean) {
    $$(`[data-mostra-se="${chiave}"]`).forEach((el) => {
      el.hidden = !si;
      el.querySelectorAll<Campo>('input, select, textarea').forEach((c) => (c.disabled = !si));
    });
  }

  function aggiornaAvviso14() {
    const avviso = $('#g-avviso-14');
    if (!avviso) return;
    const data = valore('data_contratto');
    const giorni = data && dataIsoValida(data) ? giorniTra(data, oggiIso()) : 0;
    const mostraAvviso = valore('tipo') === 'recesso_14_giorni' && giorni > 14;
    avviso.hidden = !mostraAvviso;
    avviso.textContent = mostraAvviso
      ? `Dalla data indicata sono trascorsi ${giorni} giorni. Verifica da quando decorre il termine nel tuo caso (ad esempio dalla consegna del bene o dall'attivazione del servizio) prima di inviare la lettera.`
      : '';
  }

  // ---------------------------------------------------------------- fornitore (combobox)
  const cerca = $<HTMLInputElement>('#g-cerca-fornitore')!;
  const lista = $<HTMLUListElement>('#g-lista-fornitori')!;
  const info = $('#g-fornitore-info')!;
  let opzioni: (FornitoreGen | null)[] = [];
  let attiva = -1;

  function apriLista() {
    const q = normalizza(cerca.value);
    const cat = categoriaCorrente();
    opzioni = dati.fornitori
      .filter((f) => (!cat || f.categoria === cat.slug) && (!q || normalizza(f.nome).includes(q)))
      .slice(0, 8);
    opzioni.push(null); // inserimento manuale
    attiva = -1;
    lista.replaceChildren(
      ...opzioni.map((f, i) => {
        const li = document.createElement('li');
        li.id = `g-opz-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        if (f) {
          li.textContent = f.nome;
          if (!cat) {
            const small = document.createElement('small');
            small.textContent = dati.categorie.find((c) => c.slug === f.categoria)?.nome ?? '';
            li.append(small);
          }
        } else {
          li.textContent = 'Non è in elenco: inserisco i dati a mano';
        }
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          scegli(i);
        });
        return li;
      }),
    );
    lista.hidden = false;
    cerca.setAttribute('aria-expanded', 'true');
    cerca.removeAttribute('aria-activedescendant');
  }

  function chiudiLista() {
    lista.hidden = true;
    cerca.setAttribute('aria-expanded', 'false');
    cerca.removeAttribute('aria-activedescendant');
  }

  function evidenzia(i: number) {
    const items = [...lista.children] as HTMLElement[];
    if (!items.length) return;
    attiva = (i + items.length) % items.length;
    items.forEach((li, j) => li.setAttribute('aria-selected', String(j === attiva)));
    cerca.setAttribute('aria-activedescendant', items[attiva].id);
    items[attiva].scrollIntoView({ block: 'nearest' });
  }

  function scegli(i: number) {
    const f = opzioni[i];
    chiudiLista();
    if (f) {
      selezionaFornitore(f, true);
    } else {
      deselezionaFornitore();
      cerca.value = '';
      $<HTMLInputElement>('#g-dest-nome')?.focus();
    }
  }

  function impostaCampo(id: string, v: string) {
    const el = $<HTMLInputElement>(`#${id}`);
    if (el) el.value = v;
  }

  function selezionaFornitore(f: FornitoreGen, compila: boolean) {
    fornitoreScelto = f;
    cerca.value = f.nome;
    if (compila) {
      const r = f.recapiti;
      impostaCampo('g-dest-nome', r.destinatario || f.nome);
      impostaCampo('g-dest-indirizzo', r.indirizzo);
      impostaCampo('g-dest-cap', r.cap);
      impostaCampo('g-dest-citta', r.citta);
      impostaCampo('g-dest-provincia', r.provincia);
      impostaCampo('g-dest-pec', r.pec);
    }
    const div = document.createElement('div');
    if (f.verificato && f.ultima_verifica) {
      div.className = 'alert alert-ok';
      div.textContent = `Recapiti di ${f.nome} inseriti dal nostro archivio (ultima verifica: ${f.ultima_verifica.split('-').reverse().join('/')}). Controllali comunque con il tuo contratto.`;
    } else {
      div.className = 'alert alert-warn';
      div.textContent = `Recapiti di ${f.nome} non ancora verificati: inserisci indirizzo o PEC presi dal contratto, dalle fatture o dal sito ufficiale.`;
    }
    info.replaceChildren(div);
  }

  function deselezionaFornitore() {
    fornitoreScelto = null;
    info.replaceChildren();
  }

  cerca.addEventListener('input', () => {
    if (fornitoreScelto && cerca.value !== fornitoreScelto.nome) deselezionaFornitore();
    apriLista();
  });
  cerca.addEventListener('focus', () => {
    apriLista();
    // Sui telefoni la tastiera copre i suggerimenti: porta il campo in alto.
    if (window.innerHeight < 760) cerca.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  cerca.addEventListener('blur', () => setTimeout(chiudiLista, 120));
  cerca.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (lista.hidden) apriLista();
      evidenzia(attiva + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (lista.hidden) apriLista();
      evidenzia(attiva - 1);
    } else if (e.key === 'Enter') {
      if (!lista.hidden && attiva >= 0) {
        e.preventDefault();
        scegli(attiva);
      }
    } else if (e.key === 'Escape') {
      chiudiLista();
    }
  });

  // ---------------------------------------------------------------- validazione
  function puliscierrori(container: HTMLElement) {
    container.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    container.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
  }

  function mostraErrori(errori: Errore[]) {
    for (const { el, msg, erroreId } of errori) {
      el.setAttribute('aria-invalid', 'true');
      const span = document.getElementById(erroreId ?? `${el.id}-err`);
      if (span) span.textContent = msg;
    }
  }

  function el(id: string) {
    return $<HTMLInputElement>(`#${id}`)!;
  }

  function richiesto(errori: Errore[], id: string, msg: string) {
    const c = el(id);
    if (c && !c.disabled && !c.value.trim()) errori.push({ el: c, msg });
    return c && !!c.value.trim();
  }

  function validaPasso(n: number): Errore[] {
    const errori: Errore[] = [];
    if (n === 1) {
      const cat = $<HTMLSelectElement>('#g-categoria');
      if (cat && !cat.value) errori.push({ el: cat, msg: 'Seleziona il tipo di contratto.' });
      const radio = $<HTMLInputElement>('input[name="tipo"]')!;
      if (!valore('tipo')) errori.push({ el: radio, msg: 'Seleziona il tipo di richiesta.', erroreId: 'g-tipo-err' });
      const scelta = valore('motivazione_scelta');
      if (valore('tipo') === 'altro' && !scelta) {
        errori.push({ el: el('g-motivazione'), msg: 'Indica la motivazione della richiesta.' });
      }
      if (scelta === '__altro') richiesto(errori, 'g-motivazione-testo', 'Scrivi la motivazione oppure scegline una dall\'elenco.');
    }
    if (n === 2) {
      richiesto(errori, 'g-dest-nome', 'Indica il nome del destinatario.');
      const indirizzo = valore('dest_indirizzo');
      const pec = valore('dest_pec');
      if (!indirizzo && !pec) {
        errori.push({ el: el('g-dest-indirizzo'), msg: 'Indica l\'indirizzo postale oppure la PEC del destinatario.' });
      }
      if (indirizzo) {
        if (!valore('dest_cap')) errori.push({ el: el('g-dest-cap'), msg: 'Inserisci il CAP.' });
        else if (!capValido(valore('dest_cap'))) errori.push({ el: el('g-dest-cap'), msg: 'Il CAP è di 5 cifre.' });
        richiesto(errori, 'g-dest-citta', 'Inserisci la città.');
      }
      if (valore('dest_provincia') && !provinciaValida(valore('dest_provincia'))) {
        errori.push({ el: el('g-dest-provincia'), msg: 'Usa la sigla di 2 lettere.' });
      }
      if (pec && !emailValida(pec)) errori.push({ el: el('g-dest-pec'), msg: 'Indirizzo PEC non valido.' });
    }
    if (n === 3) {
      richiesto(errori, 'g-nome', 'Inserisci il nome.');
      richiesto(errori, 'g-cognome', 'Inserisci il cognome.');
      if (richiesto(errori, 'g-cf', 'Inserisci il codice fiscale.') && !codiceFiscaleValido(valore('codice_fiscale'))) {
        errori.push({ el: el('g-cf'), msg: 'Codice fiscale non valido: controlla i 16 caratteri.' });
      }
      richiesto(errori, 'g-indirizzo', 'Inserisci l\'indirizzo di residenza.');
      if (richiesto(errori, 'g-cap', 'Inserisci il CAP.') && !capValido(valore('cap'))) {
        errori.push({ el: el('g-cap'), msg: 'Il CAP è di 5 cifre.' });
      }
      richiesto(errori, 'g-citta', 'Inserisci la città.');
      if (richiesto(errori, 'g-provincia', 'Inserisci la sigla della provincia.') && !provinciaValida(valore('provincia'))) {
        errori.push({ el: el('g-provincia'), msg: 'Usa la sigla di 2 lettere, es. MI.' });
      }
      if (valore('email') && !emailValida(valore('email'))) errori.push({ el: el('g-email'), msg: 'Email non valida.' });

      const cat = categoriaCorrente();
      let identificativo = !!valore('codice_cliente');
      for (const c of cat?.campi ?? []) {
        const input = el(`g-c-${cat!.slug}-${c.id}`);
        const v = input.value.trim();
        if (v && c.identificativo !== false) identificativo = true;
        if (c.obbligatorio && !v) errori.push({ el: input, msg: `Inserisci: ${c.etichetta.toLowerCase()}.` });
        else if (v && c.pattern && !new RegExp(c.pattern).test(v)) {
          errori.push({ el: input, msg: c.messaggio_errore || 'Formato non valido.' });
        } else if (v && c.tipo === 'email' && !emailValida(v)) errori.push({ el: input, msg: 'Email non valida.' });
      }
      if (!identificativo) {
        errori.push({ el: el('g-codice-cliente'), msg: 'Inserisci almeno un dato che identifichi il contratto (codice cliente, numero di contratto o gli altri dati richiesti).' });
      }
      const dc = valore('data_contratto');
      if (valore('tipo') === 'recesso_14_giorni' && !dc) {
        errori.push({ el: el('g-data-contratto'), msg: 'Per il recesso entro 14 giorni indica la data di conclusione del contratto.' });
      } else if (dc && (!dataIsoValida(dc) || dc > oggiIso())) {
        errori.push({ el: el('g-data-contratto'), msg: 'Inserisci una data valida, non successiva a oggi.' });
      }
    }
    if (n === 4) {
      richiesto(errori, 'g-luogo', 'Indica il luogo, ad esempio la tua città.');
      if (richiesto(errori, 'g-data-lettera', 'Indica la data della lettera.') && !dataIsoValida(valore('data_lettera'))) {
        errori.push({ el: el('g-data-lettera'), msg: 'Data non valida.' });
      }
      const dd = valore('data_decorrenza');
      if (dd && !dataIsoValida(dd)) errori.push({ el: el('g-decorrenza'), msg: 'Data non valida.' });
      if (valore('invio') === 'pec' && !valore('dest_pec')) {
        errori.push({
          el: $<HTMLInputElement>('input[name="invio"][value="pec"]')!,
          msg: 'Per inviare via PEC indica la PEC del destinatario al passo 2.',
          erroreId: 'g-invio-err',
        });
      }
      const iban = valore('iban');
      if (iban && !ibanValido(iban)) errori.push({ el: el('g-iban'), msg: 'IBAN non valido: controlla i caratteri (per l\'Italia sono 27).' });
    }
    return errori;
  }

  // ---------------------------------------------------------------- passi
  function vaiA(n: number, focus = true) {
    passo = Math.max(1, Math.min(TOTALE_PASSI, n));
    $$<HTMLFieldSetElement>('.step').forEach((s) => {
      const visibile = Number(s.dataset.step) === passo;
      s.hidden = !visibile;
      s.classList.remove('step-in');
      if (visibile && focus) {
        void s.offsetWidth; // riavvia l'animazione di entrata
        s.classList.add('step-in');
      }
    });
    root.style.setProperty('--avanzamento', String(passo - 1));
    $$('[data-progress]').forEach((li) => {
      const i = Number(li.dataset.progress);
      if (i === passo) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.toggleAttribute('data-fatto', i < passo);
    });
    if (passo === TOTALE_PASSI) preparaAnteprima();
    if (comeInviarla) comeInviarla.hidden = passo !== TOTALE_PASSI;
    if (focus) {
      const titolo = $<HTMLElement>(`#g-step${passo}-titolo`);
      titolo?.focus({ preventScroll: true });
      // Porta in vista la barra di avanzamento: titolo e avviso privacy restano sopra.
      const barra = $('#g-barra');
      if (barra && barra.getBoundingClientRect().top < 0) barra.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else if (!barra) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const step = $<HTMLElement>(`.step[data-step="${passo}"]`)!;
    puliscierrori(step);
    const errori = validaPasso(passo);
    if (errori.length) {
      mostraErrori(errori);
      annuncio.textContent = `${errori.length === 1 ? 'C\'è un campo da correggere' : `Ci sono ${errori.length} campi da correggere`}: ${errori[0].msg}`;
      errori[0].el.focus();
      return;
    }
    annuncio.textContent = '';
    vaiA(passo + 1);
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-azione]');
    if (!btn) return;
    const azione = btn.dataset.azione;
    if (azione === 'indietro') vaiA(passo - 1);
    else if (azione === 'pdf') esporta('pdf', btn as HTMLButtonElement);
    else if (azione === 'docx') esporta('docx', btn as HTMLButtonElement);
    else if (azione === 'copia') copia();
    else if (azione === 'rigenera') {
      textarea.value = ultimoTesto;
      testoModificato = false;
      salvaBozzaRitardata();
      stato.textContent = 'Testo ripristinato.';
    } else if (azione === 'ricomincia') ricomincia();
    else if (azione === 'ripristina-bozza') ripristinaBozza();
    else if (azione === 'elimina-bozza') eliminaBozza();
  });

  // ---------------------------------------------------------------- lettera
  function datiLettera(): DatiLettera {
    const cat = categoriaCorrente()!;
    const campi: Record<string, string> = {};
    for (const c of cat.campi) campi[c.id] = el(`g-c-${cat.slug}-${c.id}`).value.trim();
    const scelta = valore('motivazione_scelta');
    const allegati = [
      ...$$<HTMLInputElement>('input[name="allegato_suggerito"]').filter((c) => c.checked && !c.disabled).map((c) => c.value),
      ...valore('altri_allegati').split('\n'),
    ];
    return {
      tipo: valore('tipo') as TipoRichiestaId,
      categoria: cat as Categoria,
      tipi: dati.tipi,
      blocchi: dati.blocchi,
      riferimenti: dati.riferimenti,
      includiRiferimentiNonVerificati: dati.includiRiferimentiNonVerificati,
      motivazione: scelta === '__altro' ? valore('motivazione_testo') : scelta,
      destinatario: {
        nome: valore('dest_nome'),
        indirizzo: valore('dest_indirizzo'),
        cap: valore('dest_cap'),
        citta: valore('dest_citta'),
        provincia: valore('dest_provincia'),
        pec: valore('dest_pec'),
      },
      mittente: {
        nome: valore('nome'),
        cognome: valore('cognome'),
        codiceFiscale: valore('codice_fiscale'),
        indirizzo: valore('indirizzo'),
        cap: valore('cap'),
        citta: valore('citta'),
        provincia: valore('provincia'),
        email: valore('email'),
        telefono: valore('telefono'),
      },
      codiceCliente: valore('codice_cliente'),
      campi,
      dataContratto: valore('data_contratto'),
      dataLettera: valore('data_lettera') || oggiIso(),
      dataDecorrenza: valore('data_decorrenza'),
      luogo: valore('luogo'),
      invio: (valore('invio') || 'raccomandata') as ModalitaInvio,
      apparati: spuntato('g-apparati'),
      modalitaRestituzione: valore('modalita_restituzione'),
      rimborso: spuntato('g-rimborso'),
      iban: spuntato('g-rimborso') ? valore('iban') : '',
      intestatarioIban: spuntato('g-rimborso') ? valore('intestatario_iban') : '',
      allegaDocumento: spuntato('g-allega-documento'),
      allegati,
    };
  }

  function preparaAnteprima() {
    const d = datiLettera();
    const firma = JSON.stringify(d);
    const lettera = generaLettera(d);
    nomeFile = lettera.nomeFile;
    avvisoAggiornata.hidden = true;
    if (firma !== ultimaFirma || !textarea.value) {
      if (testoModificato && ultimaFirma) {
        avvisoAggiornata.textContent = 'Hai modificato i dati: la lettera è stata rigenerata e le modifiche fatte a mano al testo precedente sono state sostituite.';
        avvisoAggiornata.hidden = false;
      }
      textarea.value = lettera.testo;
      testoModificato = false;
    }
    ultimaFirma = firma;
    ultimoTesto = lettera.testo;
    stato.textContent = '';
    salvaBozzaRitardata();
  }

  textarea.addEventListener('input', () => {
    testoModificato = textarea.value !== ultimoTesto;
    salvaBozzaRitardata();
  });

  async function esporta(formato: 'pdf' | 'docx', btn: HTMLButtonElement) {
    const testo = textarea.value.trim();
    if (!testo) return;
    btn.disabled = true;
    stato.textContent = 'Preparazione del file in corso…';
    try {
      if (formato === 'pdf') {
        const { scaricaPdf } = await import('./export-pdf.ts');
        scaricaPdf(testo, nomeFile);
      } else {
        const { scaricaDocx } = await import('./export-docx.ts');
        await scaricaDocx(testo, nomeFile);
      }
      stato.textContent = `File ${formato.toUpperCase()} scaricato. Ricordati di firmarlo prima dell'invio.`;
    } catch (err) {
      console.error(err);
      stato.textContent = 'Non è stato possibile creare il file. Riprova oppure copia il testo.';
    } finally {
      btn.disabled = false;
    }
  }

  async function copia() {
    const testo = textarea.value;
    try {
      await navigator.clipboard.writeText(testo);
    } catch {
      textarea.select();
      document.execCommand('copy');
    }
    stato.textContent = 'Testo copiato negli appunti.';
  }

  function ricomincia() {
    if (!confirm('Vuoi cancellare tutti i dati inseriti e ricominciare?')) return;
    form.reset();
    el('g-data-lettera').value = oggiIso();
    eliminaBozza();
    textarea.value = '';
    ultimaFirma = '';
    testoModificato = false;
    deselezionaFornitore();
    inizializzaFornitore();
    aggiornaCategoria(true);
    vaiA(1);
  }

  // ---------------------------------------------------------------- bozza locale
  const ESCLUSI = new Set(['iban', 'salva_bozza']);
  let timerBozza: ReturnType<typeof setTimeout> | undefined;

  function salvaBozzaRitardata() {
    clearTimeout(timerBozza);
    timerBozza = setTimeout(salvaBozza, 400);
  }

  function salvaBozza() {
    if (!spuntato('g-salva-bozza')) return;
    const valori: Record<string, string | string[] | boolean> = {};
    for (const c of form.elements as unknown as Campo[]) {
      if (!('name' in c) || !c.name || ESCLUSI.has(c.name)) continue;
      if (c instanceof HTMLInputElement && (c.type === 'checkbox' || c.type === 'radio')) {
        if (c.name === 'allegato_suggerito') {
          if (c.checked) ((valori[c.name] ??= []) as string[]).push(c.value);
        } else if (c.type === 'radio') {
          if (c.checked) valori[c.name] = c.value;
        } else valori[c.name] = c.checked;
      } else valori[c.name] = c.value;
    }
    const bozza = {
      data: new Date().toISOString(),
      categoria: valore('categoria'),
      fornitore: fornitoreScelto?.slug ?? '',
      passo,
      valori,
      lettera: testoModificato ? textarea.value : '',
    };
    try {
      localStorage.setItem(CHIAVE_BOZZA, JSON.stringify(bozza));
    } catch {
      /* archiviazione non disponibile */
    }
  }

  function leggiBozza() {
    try {
      return JSON.parse(localStorage.getItem(CHIAVE_BOZZA) || 'null');
    } catch {
      return null;
    }
  }

  function eliminaBozza() {
    try {
      localStorage.removeItem(CHIAVE_BOZZA);
    } catch {
      /* niente da fare */
    }
    $('#g-bozza')!.hidden = true;
  }

  function ripristinaBozza() {
    const b = leggiBozza();
    $('#g-bozza')!.hidden = true;
    if (!b) return;
    const sel = $<HTMLSelectElement>('#g-categoria');
    if (sel && b.categoria) {
      sel.value = b.categoria;
      aggiornaCategoria(true);
    }
    for (const [nome, v] of Object.entries(b.valori as Record<string, unknown>)) {
      if (nome === 'categoria') continue;
      const c = campo(nome);
      if (!c) continue;
      if (c instanceof RadioNodeList) {
        for (const n of c as unknown as Iterable<HTMLInputElement>) {
          if (n.type === 'checkbox') n.checked = Array.isArray(v) && v.includes(n.value);
          else if (n.type === 'radio') n.checked = n.value === v;
          else if (!n.disabled) n.value = String(v ?? '');
        }
      } else if (c instanceof HTMLInputElement && c.type === 'checkbox') {
        if (nome === 'allegato_suggerito') c.checked = Array.isArray(v) && v.includes(c.value);
        else c.checked = !!v;
      } else c.value = String(v ?? '');
    }
    const f = dati.fornitori.find((x) => x.slug === b.fornitore);
    if (f) selezionaFornitore(f, false);
    aggiornaVisibilita();
    if (b.lettera) {
      vaiA(TOTALE_PASSI, false);
      textarea.value = b.lettera;
      testoModificato = true;
    } else {
      vaiA(Math.min(Number(b.passo) || 1, TOTALE_PASSI), false);
    }
    $<HTMLElement>(`#g-step${passo}-titolo`)?.focus();
    annuncio.textContent = 'Bozza ripristinata.';
  }

  $<HTMLInputElement>('#g-salva-bozza')?.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) salvaBozza();
    else eliminaBozza();
  });

  // ---------------------------------------------------------------- avvio
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t.id === 'g-categoria') aggiornaCategoria(true);
    else aggiornaVisibilita();
    salvaBozzaRitardata();
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.getAttribute('aria-invalid') === 'true') {
      t.removeAttribute('aria-invalid');
      const span = document.getElementById(`${t.id}-err`);
      if (span) span.textContent = '';
    }
    if (t.id === 'g-data-contratto') aggiornaAvviso14();
    salvaBozzaRitardata();
  });
  // Il luogo predefinito è la città di residenza.
  el('g-citta').addEventListener('change', () => {
    const luogo = el('g-luogo');
    if (!luogo.value.trim()) luogo.value = el('g-citta').value.trim();
  });

  function inizializzaFornitore() {
    const preselezionato = root.dataset.fornitore || form.dataset.fornitore;
    const f = preselezionato ? dati.fornitori.find((x) => x.slug === preselezionato) : undefined;
    if (f) selezionaFornitore(f, true);
  }

  inizializzaFornitore();
  aggiornaCategoria(false);
  // La pagina è statica: la data di oggi va impostata nel browser.
  const dataLettera = el('g-data-lettera');
  if (!dataLettera.value) dataLettera.value = oggiIso();
  const bozza = leggiBozza();
  const catFissa = $<HTMLInputElement>('input[type="hidden"][name="categoria"]')?.value;
  if (bozza && (!catFissa || bozza.categoria === catFissa)) {
    $('#g-bozza')!.hidden = false;
    $<HTMLInputElement>('#g-salva-bozza')!.checked = true;
  }
}
