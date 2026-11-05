// M5 — Integridad de los datos que el usuario edita a mano
// (world.json, stories.json, habits.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJSON = (name) => JSON.parse(
  readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'),
);
const world = readJSON('world');
const stories = readJSON('stories');
const habitsData = readJSON('habits');

test('ids de ciudad únicos', () => {
  const ids = world.cities.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('ids de ruta únicos', () => {
  const ids = world.routes.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('cada ruta referencia ciudades existentes', () => {
  const cityIds = new Set(world.cities.map((c) => c.id));
  for (const r of world.routes) {
    assert.ok(cityIds.has(r.from), `ruta ${r.id}: "from" desconocido "${r.from}"`);
    assert.ok(cityIds.has(r.to), `ruta ${r.id}: "to" desconocido "${r.to}"`);
  }
});

test('más de una ruta entre el mismo par exige "via" en cada una', () => {
  const groups = new Map();
  for (const r of world.routes) {
    const key = [r.from, r.to].sort().join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(r);
  }
  for (const [key, group] of groups) {
    if (group.length > 1) {
      for (const r of group) {
        assert.ok(
          typeof r.via === 'string' && r.via !== '',
          `ruta ${r.id} (${key}) comparte trazado pero no tiene "via"`,
        );
      }
    }
  }
});

test('todo waypoint está entre 0 y 100', () => {
  for (const r of world.routes) {
    const waypoints = r.waypoints ?? [];
    for (const [i, wp] of waypoints.entries()) {
      assert.ok(
        typeof wp.x === 'number' && wp.x >= 0 && wp.x <= 100,
        `ruta ${r.id} waypoint[${i}].x = ${wp.x}`,
      );
      assert.ok(
        typeof wp.y === 'number' && wp.y >= 0 && wp.y <= 100,
        `ruta ${r.id} waypoint[${i}].y = ${wp.y}`,
      );
    }
  }
});

test('cada ciudad tiene texto en stories.json', () => {
  for (const c of world.cities) {
    const text = stories.stories?.[c.id];
    assert.ok(
      typeof text === 'string' && text !== '',
      `falta la historia de la ciudad "${c.id}" en stories.json`,
    );
  }
});

test('cada hábito tiene los campos requeridos para su estilo', () => {
  const directFields = ['minDesc', 'fullDesc', 'minPoints', 'fullPoints'];
  for (const h of habitsData.habits) {
    if (h.style === 'direct') {
      for (const field of directFields) {
        assert.ok(Object.prototype.hasOwnProperty.call(h, field), `${h.id}: falta "${field}"`);
      }
      assert.ok(typeof h.minDesc === 'string' && h.minDesc !== '', `${h.id}: minDesc vacío`);
      assert.ok(typeof h.fullDesc === 'string' && h.fullDesc !== '', `${h.id}: fullDesc vacío`);
      assert.equal(typeof h.minPoints, 'number', `${h.id}: minPoints no es numérico`);
      assert.equal(typeof h.fullPoints, 'number', `${h.id}: fullPoints no es numérico`);
    } else if (h.style === 'number') {
      for (const field of directFields) {
        assert.ok(
          !Object.prototype.hasOwnProperty.call(h, field),
          `${h.id}: estilo "number" no debería tener "${field}"`,
        );
      }
    }
  }
});

// P5c: la app solo implementa dos estilos (direct y number); el estilo
// cíclico viejo se eliminó, así que un estilo desconocido es un error de datos.
test('todo hábito usa un estilo soportado (direct o number)', () => {
  for (const h of habitsData.habits) {
    assert.ok(
      h.style === 'direct' || h.style === 'number',
      `${h.id}: estilo "${h.style}" no soportado (válidos: direct, number)`,
    );
  }
});
