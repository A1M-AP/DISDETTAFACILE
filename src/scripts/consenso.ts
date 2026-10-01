// Gestione del consenso ai cookie, memorizzato solo nel browser (localStorage).
// Altri script possono leggere window.dfConsenso o ascoltare l'evento "df:consenso".

export interface Consenso {
  versione: number;
  data: string;
  statistiche: boolean;
  marketing: boolean;
}

declare global {
  interface Window {
    dfConsenso?: Consenso | null;
  }
}

const CHIAVE = 'df-consenso';

function leggi(versione: number, mesi: number): Consenso | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHIAVE) || 'null') as Consenso | null;
    if (!c || c.versione !== versione) return null;
    const scadenza = new Date(c.data);
    scadenza.setMonth(scadenza.getMonth() + mesi);
    return scadenza > new Date() ? c : null;
  } catch {
    return null;
  }
}

function pubblica(c: Consenso | null) {
  window.dfConsenso = c;
  document.dispatchEvent(new CustomEvent('df:consenso', { detail: c }));
}

export function avviaConsenso() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  const versione = Number(banner.dataset.versione || 1);
  const mesi = Number(banner.dataset.mesi || 6);
  const prefs = banner.querySelector<HTMLFieldSetElement>('#cookie-prefs')!;
  const btn = (azione: string) => banner.querySelector<HTMLButtonElement>(`[data-cookie="${azione}"]`)!;
  const casella = (nome: string) => prefs.querySelector<HTMLInputElement>(`input[name="${nome}"]`)!;
  let ultimoFocus: HTMLElement | null = null;

  const attuale = leggi(versione, mesi);
  pubblica(attuale);

  function apri(personalizza: boolean) {
    const c = leggi(versione, mesi);
    casella('statistiche').checked = !!c?.statistiche;
    casella('marketing').checked = !!c?.marketing;
    mostraPreferenze(personalizza);
    banner!.hidden = false;
  }

  function mostraPreferenze(si: boolean) {
    prefs.hidden = !si;
    btn('personalizza').hidden = si;
    btn('personalizza').setAttribute('aria-expanded', String(si));
    btn('salva').hidden = !si;
  }

  function salva(statistiche: boolean, marketing: boolean) {
    const c: Consenso = { versione, data: new Date().toISOString(), statistiche, marketing };
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(c));
    } catch {
      /* archiviazione non disponibile: la scelta vale solo per questa pagina */
    }
    banner!.hidden = true;
    pubblica(c);
    ultimoFocus?.focus();
  }

  btn('accetta').addEventListener('click', () => salva(true, true));
  btn('rifiuta').addEventListener('click', () => salva(false, false));
  btn('chiudi').addEventListener('click', () => salva(false, false));
  btn('salva').addEventListener('click', () => salva(casella('statistiche').checked, casella('marketing').checked));
  btn('personalizza').addEventListener('click', () => {
    mostraPreferenze(true);
    casella('statistiche').focus();
  });
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') salva(false, false);
  });

  document.querySelectorAll<HTMLElement>('[data-cookie-open]').forEach((el) =>
    el.addEventListener('click', () => {
      ultimoFocus = el;
      apri(true);
      btn('salva').focus();
    }),
  );

  if (!attuale) apri(false);
}
