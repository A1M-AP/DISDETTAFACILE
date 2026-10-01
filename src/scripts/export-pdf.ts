// Esportazione PDF con jsPDF, caricato solo quando l'utente lo richiede.
import { jsPDF } from 'jspdf';
import { scaricaBlob } from './download.ts';

const MARGINE = 22; // mm
const INTERLINEA = 5.4; // mm
const RIGA_VUOTA = 3.6; // mm
const ALTEZZA_PAGINA = 297;

/** I font standard del PDF supportano il set WinAnsi: sostituisce i caratteri non rappresentabili. */
export function testoCompatibile(testo: string): string {
  return testo
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2015]/g, '-')
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/[^\n\t -~\u00a0-\u00ff\u2013\u2014\u2026\u20ac]/g, '?');
}

export function creaPdf(testo: string, titolo: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: titolo, creator: 'DisdettaFacile.it' });
  doc.setFontSize(11);
  const larghezza = 210 - MARGINE * 2;
  let y = MARGINE + 3;

  for (const riga of testoCompatibile(testo).split('\n')) {
    if (!riga.trim()) {
      y += RIGA_VUOTA;
      continue;
    }
    // Spazio più ampio per la firma autografa.
    if (/^_{5,}$/.test(riga.trim())) y += 8;
    doc.setFont('helvetica', riga.startsWith('Oggetto:') ? 'bold' : 'normal');
    const pezzi: string[] = doc.splitTextToSize(riga, larghezza);
    for (const p of pezzi) {
      if (y > ALTEZZA_PAGINA - MARGINE) {
        doc.addPage();
        y = MARGINE + 3;
      }
      doc.text(p, MARGINE, y);
      y += INTERLINEA;
    }
  }
  return doc;
}

export function scaricaPdf(testo: string, nomeFile: string) {
  scaricaBlob(creaPdf(testo, nomeFile).output('blob'), `${nomeFile}.pdf`);
}
