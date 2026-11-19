// M4 — Respaldo: validación del archivo y días desde el último export.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetLocalStorage } from './helpers/localStorage.js';
import { isValidBackup, daysSinceBackup } from '../js/backup.js';
import { replaceByPrefix } from '../js/storage.js';
import { STORAGE_PREFIX, CUSTOM_HABITS_KEY, CHARACTER_KEY, DATA_KEY } from '../js/config.js';

function characterValido() {
  return {
    equipped: { casco: 'casco-01', armadura: null },
    offer: { cityId: 'arvandill', itemIds: ['brazaletes-01'] },
  };
}

function storageSnapshot() {
  const out = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    out[key] = localStorage.getItem(key);
  }
  return out;
}

beforeEach(() => {
  resetLocalStorage();
});

function backupValido() {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 3,
    data: {
      'habitQuest:data:v1': {
        schemaVersion: 3,
        days: { '2000-01-01': { ejercicio: { level: 2, points: 3, sentPoints: 3 } } },
      },
      'habitQuest:world:v1': {
        spent: 0,
        currentCity: 'arvandill',
        visited: ['arvandill'],
        explored: [],
      },
    },
  };
}

test('isValidBackup: respaldo válido', () => {
  assert.equal(isValidBackup(backupValido()), true);
});

test('isValidBackup: sin exportedAt → inválido', () => {
  const backup = backupValido();
  delete backup.exportedAt;
  assert.equal(isValidBackup(backup), false);
});

test('isValidBackup: data sin claves "habitQuest:" → inválido', () => {
  const backup = backupValido();
  backup.data = { 'otra:clave': { days: {} } };
  assert.equal(isValidBackup(backup), false);
});

test('isValidBackup: days con un valor no numérico → inválido', () => {
  const backup = backupValido();
  backup.data['habitQuest:data:v1'] = {
    schemaVersion: 3,
    days: { '2000-01-01': { ejercicio: { level: 1, points: 'uno' } } },
  };
  assert.equal(isValidBackup(backup), false);
});

test('isValidBackup: world sin currentCity → inválido', () => {
  const backup = backupValido();
  delete backup.data['habitQuest:world:v1'].currentCity;
  assert.equal(isValidBackup(backup), false);
});

function customValido(id = 'custom-1', archivedDate = null) {
  return {
    id,
    label: 'Leer',
    minDesc: '5 minutos',
    fullDesc: '20 minutos',
    minPoints: 1,
    fullPoints: 3,
    style: 'direct',
    archived: archivedDate !== null,
    archivedDate,
  };
}

test('isValidBackup: respaldo viejo sin customHabits sigue siendo válido', () => {
  assert.equal(isValidBackup(backupValido()), true);
  assert.equal(CUSTOM_HABITS_KEY in backupValido().data, false);
});

test('isValidBackup: customHabits válido (activo + archivado) → válido', () => {
  const backup = backupValido();
  backup.data[CUSTOM_HABITS_KEY] = [customValido(), customValido('custom-2', '2000-01-01')];
  assert.equal(isValidBackup(backup), true);
});

test('isValidBackup: customHabits como string JSON también se acepta', () => {
  const backup = backupValido();
  backup.data[CUSTOM_HABITS_KEY] = JSON.stringify([customValido()]);
  assert.equal(isValidBackup(backup), true);
});

test('isValidBackup: archivedDate con formato inválido → inválido sin tocar datos', () => {
  const backup = backupValido();
  backup.data[CUSTOM_HABITS_KEY] = [customValido('custom-1', '01/01/2000')];
  localStorage.setItem(DATA_KEY, JSON.stringify({ days: { intacto: {} } }));
  localStorage.setItem('habitQuest:world:v1', 'valor-viejo');
  assert.equal(isValidBackup(backup), false);
  assert.equal(localStorage.getItem(DATA_KEY), JSON.stringify({ days: { intacto: {} } }));
  assert.equal(localStorage.getItem('habitQuest:world:v1'), 'valor-viejo');
  assert.equal(localStorage.getItem(CUSTOM_HABITS_KEY), null);
});

test('isValidBackup: customHabits malformado → inválido', () => {
  for (const bad of [
    'no-es-lista',
    [{ ...customValido(), fullPoints: 2 }],
    [{ ...customValido() }, { ...customValido() }], // ids repetidos
    [customValido(), customValido('custom-2'), customValido('custom-3'), customValido('custom-4')],
  ]) {
    const backup = backupValido();
    backup.data[CUSTOM_HABITS_KEY] = bad;
    assert.equal(isValidBackup(backup), false);
  }
});

test('isValidBackup: respaldo viejo sin character sigue siendo válido', () => {
  assert.equal(isValidBackup(backupValido()), true);
  assert.equal(CHARACTER_KEY in backupValido().data, false);
});

test('isValidBackup: character válido (objeto y string JSON) → válido', () => {
  const backup = backupValido();
  backup.data[CHARACTER_KEY] = characterValido();
  assert.equal(isValidBackup(backup), true);

  const asString = backupValido();
  asString.data[CHARACTER_KEY] = JSON.stringify(characterValido());
  assert.equal(isValidBackup(asString), true);
});

test('isValidBackup: character malformado → inválido sin tocar datos', () => {
  const malformed = [
    'basura',
    [],
    { equipped: [], offer: null },
    { equipped: { casco: 3 }, offer: null },
    { equipped: {}, offer: { itemIds: ['casco-01'] } },
    { equipped: {}, offer: { cityId: 'arvandill', itemIds: 'casco-01' } },
    { equipped: {}, offer: { cityId: 'arvandill', itemIds: [3] } },
  ];
  localStorage.setItem(CHARACTER_KEY, JSON.stringify(characterValido()));
  localStorage.setItem(DATA_KEY, JSON.stringify({ days: { intacto: {} } }));
  const before = storageSnapshot();

  for (const bad of malformed) {
    const backup = backupValido();
    backup.data[CHARACTER_KEY] = bad;
    assert.equal(isValidBackup(backup), false, `debió rechazarse: ${JSON.stringify(bad)}`);
  }
  assert.deepEqual(storageSnapshot(), before);
});

test('daysSinceBackup: sin dato = null', () => {
  assert.equal(daysSinceBackup({}), null);
});

test('daysSinceBackup: fecha de hoy = 0', () => {
  assert.equal(daysSinceBackup({ lastBackupAt: new Date().toISOString() }), 0);
});

// El importar un respaldo solo escribe claves con el prefijo del juego: las
// demás apps comparten el mismo localStorage y no deben ni escribirse ni tocarse.
test('replaceByPrefix: una clave de otra app en el respaldo NO se escribe', () => {
  replaceByPrefix(STORAGE_PREFIX, { 'habitQuest:data:v1': { days: {} }, 'otraApp:x': 1 });
  assert.equal(localStorage.getItem('otraApp:x'), null);
  assert.ok(localStorage.getItem('habitQuest:data:v1') !== null);
});

test('replaceByPrefix: una clave de otra app ya existente NO se toca', () => {
  localStorage.setItem('otraApp:y', 'valor-viejo');
  replaceByPrefix(STORAGE_PREFIX, { 'habitQuest:world:v1': { spent: 0 } });
  assert.equal(localStorage.getItem('otraApp:y'), 'valor-viejo');
});

test('replaceByPrefix: escribe las habitQuest: del respaldo y borra las actuales ausentes', () => {
  localStorage.setItem('habitQuest:data:v1', 'viejo');
  localStorage.setItem('habitQuest:meta:v1', 'se-borra');
  replaceByPrefix(STORAGE_PREFIX, {
    'habitQuest:data:v1': { days: {} },
    'otraApp:x': 1,
  });
  assert.deepEqual(JSON.parse(localStorage.getItem('habitQuest:data:v1')), { days: {} });
  assert.equal(localStorage.getItem('habitQuest:meta:v1'), null);
  assert.equal(localStorage.getItem('otraApp:x'), null);
});
