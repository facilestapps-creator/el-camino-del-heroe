// M1 — Base: los módulos de lógica importan sin error en Node (sin DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/localStorage.js';

const LOGIC_MODULES = ['config', 'storage', 'text', 'journey', 'habits', 'world', 'backup'];

test('los módulos de lógica importan sin error en Node', async () => {
  for (const name of LOGIC_MODULES) {
    await assert.doesNotReject(
      () => import(`../js/${name}.js`),
      `falló la importación de js/${name}.js`,
    );
  }
});
