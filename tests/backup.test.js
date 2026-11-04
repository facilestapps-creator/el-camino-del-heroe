// M4 — Respaldo: validación del archivo y días desde el último export.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetLocalStorage } from './helpers/localStorage.js';
import { isValidBackup, daysSinceBackup } from '../js/backup.js';

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
