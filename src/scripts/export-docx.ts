// Esportazione Word (.docx) con la libreria docx, caricata solo quando l'utente la richiede.
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { scaricaBlob } from './download.ts';

const MARGINE_TWIP = 1247; // circa 22 mm

export function creaDocx(testo: string, titolo: string): Document {
  const paragrafi = testo.split('\n').map(
    (riga) =>
      new Paragraph({
        spacing: { after: 0, line: 300 },
        children: [new TextRun({ text: riga, bold: riga.startsWith('Oggetto:') })],
      }),
  );
  return new Document({
    creator: 'DisdettaFacile.it',
    title: titolo,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: MARGINE_TWIP, bottom: MARGINE_TWIP, left: MARGINE_TWIP, right: MARGINE_TWIP } },
        },
        children: paragrafi,
      },
    ],
  });
}

export async function scaricaDocx(testo: string, nomeFile: string) {
  const blob = await Packer.toBlob(creaDocx(testo, nomeFile));
  scaricaBlob(blob, `${nomeFile}.docx`);
}
