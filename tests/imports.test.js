// M1 — Base: todos los módulos importan sin error en Node (sin DOM).
// Se exceptúa app.js: ejecuta main() al importar (arranca la app entera).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/localStorage.js';

const LOGIC_MODULES = [
  'config',
  'storage',
  'dataFiles',
  'text',
  'journey',
  'habits',
  'world',
  'backup',
  'ui',
  'worldUI',
  'habitsFlow',
  'worldFlow',
  'backupFlow',
];

test('todos los módulos (salvo app.js) importan sin error en Node', async () => {
  for (const name of LOGIC_MODULES) {
    await assert.doesNotReject(
      () => import(`../js/${name}.js`),
      `falló la importación de js/${name}.js`,
    );
  }
});
