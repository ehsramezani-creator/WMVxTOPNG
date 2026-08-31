import test from 'node:test';
import assert from 'node:assert/strict';
import { parseListFile, safeRelativePath } from '../src/mpq/ModelsTreeBuilder.js';

test('MPQ list parser keeps internal file paths', () => {
  const list = `Character\\Human\\Male\\HumanMale.m2\nCharacter\\Human\\Male\\HumanMale00.skin\n# comment\n`;
  assert.deepEqual(parseListFile(list), [
    'Character\\Human\\Male\\HumanMale.m2',
    'Character\\Human\\Male\\HumanMale00.skin',
  ]);
});

test('MPQ paths are normalized safely', () => {
  assert.equal(safeRelativePath('Character/Human/Male/HumanMale.m2'), 'Character\\Human\\Male\\HumanMale.m2');
  assert.equal(safeRelativePath('..\\outside.m2'), null);
  assert.equal(safeRelativePath('C:\\outside.m2'), null);
});
