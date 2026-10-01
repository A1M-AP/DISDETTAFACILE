// Verifica i file dati e riepiloga cosa è ancora "DA VERIFICARE".
// Uso: npm run check:data            (errori bloccanti, avvisi informativi)
//      npm run check:data:strict     (anche gli avvisi fanno fallire: da usare prima della pubblicazione)
import { readFileSync } from 'node:fs';
import type { DatiCategorie, DatiFornitori } from '../src/lib/types.ts';
import { verificaDati } from '../src/lib/data-validate.ts';

const leggi = <T>(file: string): T => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
const strict = process.argv.includes('--strict');

const { errori, avvisi } = verificaDati(leggi<DatiCategorie>('categorie.json'), leggi<DatiFornitori>('fornitori.json'));

for (const e of errori) console.error(`✗ ERRORE  ${e}`);
for (const a of avvisi) console.warn(`! AVVISO  ${a}`);
console.log(`\n${errori.length} errori, ${avvisi.length} avvisi.`);

if (errori.length || (strict && avvisi.length)) process.exit(1);
