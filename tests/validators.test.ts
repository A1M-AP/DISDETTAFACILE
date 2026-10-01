import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capValido, codiceFiscaleValido, dataIsoValida, emailValida, formattaIban, ibanValido, partitaIvaValida } from '../src/lib/validators.ts';

test('codice fiscale: valido, minuscolo, con spazi e omocodia', () => {
  assert.equal(codiceFiscaleValido('RSSMRA80A01H501U'), true);
  assert.equal(codiceFiscaleValido('rssmra80a01h501u'), true);
  assert.equal(codiceFiscaleValido('RSS MRA 80A01 H501U'), true);
  assert.equal(codiceFiscaleValido('RSSMRA80A01H50MM'), true); // omocodia
});

test('codice fiscale: carattere di controllo o formato errati', () => {
  assert.equal(codiceFiscaleValido('RSSMRA80A01H501X'), false);
  assert.equal(codiceFiscaleValido('RSSMRA80Z01H501U'), false);
  assert.equal(codiceFiscaleValido('RSSMRA80A01'), false);
  assert.equal(codiceFiscaleValido(''), false);
});

test('codice fiscale numerico (11 cifre)', () => {
  assert.equal(partitaIvaValida('12345678903'), true);
  assert.equal(codiceFiscaleValido('12345678903'), true);
  assert.equal(codiceFiscaleValido('12345678901'), false);
});

test('IBAN', () => {
  assert.equal(ibanValido('IT60X0542811101000000123456'), true);
  assert.equal(ibanValido('it60 x054 2811 1010 0000 0123 456'), true);
  assert.equal(ibanValido('IT60X0542811101000000123457'), false);
  assert.equal(ibanValido('IT60X054281110100000012345'), false);
  assert.equal(ibanValido('DE89370400440532013000'), true);
  assert.equal(formattaIban('IT60X0542811101000000123456'), 'IT60 X054 2811 1010 0000 0123 456');
});

test('altri campi', () => {
  assert.equal(capValido('00184'), true);
  assert.equal(capValido('0018'), false);
  assert.equal(emailValida('nome@esempio.it'), true);
  assert.equal(emailValida('nome@esempio'), false);
  assert.equal(dataIsoValida('2026-02-29'), false);
  assert.equal(dataIsoValida('2028-02-29'), true);
});
