// Punto di integrazione per un circuito pubblicitario.
// Gli spazi sono già presenti in pagina con altezza riservata (<aside data-ad-slot="...">).
// Caricare script di terze parti SOLO dopo il consenso "marketing".
//
// Esempio di integrazione (da adattare al circuito scelto):
//
//   document.addEventListener('df:consenso', (e) => {
//     const consenso = (e as CustomEvent).detail;
//     if (!consenso?.marketing) return;
//     const s = document.createElement('script');
//     s.src = 'https://esempio-circuito.invalid/ads.js';
//     s.async = true;
//     document.head.append(s);
//   });
//
// Per attivarlo importare questo file in src/layouts/Base.astro con:
//   <script>import '../scripts/ads.ts';</script>
// e aggiornare la cookie policy con le terze parti coinvolte (incrementando cookie.versione in site.config.mjs).

export {};
