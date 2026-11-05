// M4 — Respaldo: validación del archivo y días desde el último export.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetLocalStorage } from './helpers/localStorage.js';
import { isValidBackup, daysSinceBackup } from '../js/backup.js';
import { replaceByPrefix } from '../js/storage.js';
import { STORAGE_PREFIX } from '../js/config.js';

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
