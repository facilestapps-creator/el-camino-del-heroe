// M3 — Lógica del mundo con el world.json REAL (leído con fs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetLocalStorage } from './helpers/localStorage.js';
import {
  shortestPath,
  pathCost,
  flowBalanceToTrip,
  cancelTrip,
  rollDragon,
  enterCity,
  exploreCity,
  settleArrival,
  markerPosition,
  startTrip,
  exploreCost,
  hydrateRouteCosts,
} from '../js/world.js';

const world = JSON.parse(
  readFileSync(new URL('../data/world.json', import.meta.url), 'utf8'),
);
// P6: los costos se derivan del largo al cargar (world.json no trae points).
hydrateRouteCosts(world);
const cities = Object.fromEntries(world.cities.map((c) => [c.id, c]));
const route = (id) => world.routes.find((r) => r.id === id);

beforeEach(() => {
  resetLocalStorage();
});

function freshState(currentCity = world.startCity) {
  return {
    schemaVersion: 1,
    spent: 0,
    currentCity,
    visited: [world.startCity],
    explored: [],
    trip: null,
    dragonRolls: {},
  };
}

test('a) shortestPath: Western Glades → Starkrock usa la ruta de dragones', () => {
  const result = shortestPath(world, 'western-glades', 'starkrock');
  assert.deepEqual(result.path, ['western-glades', 'starkrock']);
  assert.deepEqual(result.edges.map((e) => e.id), ['wg-stark-bay']);
  assert.equal(result.baseCost, 47); // P6: 636 px ÷ 13,6
});

test('a2) shortestPath: Dar\'Hanok → Starkrock pasa por Arvandill', () => {
  const result = shortestPath(world, 'darhanok', 'starkrock');
  assert.deepEqual(result.path, ['darhanok', 'arvandill', 'starkrock']);
  assert.equal(result.baseCost, 76); // 40 + 36 (costos P6 derivados del largo)
});

test('a3) shortestPath: Arvandill → Sandquill elige la ruta de menor costo', () => {
  const result = shortestPath(world, 'arvandill', 'sandquill');
  assert.deepEqual(result.path, ['arvandill', 'sandquill']);
  assert.deepEqual(result.edges.map((e) => e.id), ['arv-sand-bay']); // 19 (Bahía) < 23 (Bosque)
  assert.equal(result.baseCost, 19);
});

test('b) pathCost: multiplicador ×4 y el tramo de dragones se duplica', () => {
  const dragonRoute = route('wg-stark-bay');
  assert.equal(pathCost(world, [dragonRoute], false), 188); // 47 × 4
  assert.equal(pathCost(world, [dragonRoute], true), 376); // con dragón
});

test('c) flowBalanceToTrip: flujo parcial y nunca supera el costo', () => {
  const state = freshState();
  startTrip(state, 'vornstead', 40, false, false, null);

  const flow = flowBalanceToTrip(state, 25); // saldo 25, costo 40
  assert.equal(flow, 25);
  assert.equal(state.trip.progress, 25);
  assert.equal(state.spent, 25);

  const resto = flowBalanceToTrip(state, 1000); // nunca supera el costo
  assert.equal(resto, 15);
  assert.equal(state.trip.progress, 40);
  assert.equal(state.spent, 40);

  assert.equal(flowBalanceToTrip(state, 1000), 0); // ya llegó al tope
  assert.equal(state.trip.progress, 40);
});

test('d) cancelTrip devuelve lo invertido', () => {
  const state = freshState();
  startTrip(state, 'vornstead', 40, false, false, null);
  flowBalanceToTrip(state, 25);
  assert.equal(state.spent, 25);

  cancelTrip(state);
  assert.equal(state.spent, 0); // spent vuelve a 0
  assert.equal(state.trip, null);
});

test('e) rollDragon: la segunda tirada del mismo tramo usa el cache', () => {
  const state = freshState();
  const first = rollDragon(state, world, 'wg-stark-bay');
  assert.equal(first.cached, false);

  const second = rollDragon(state, world, 'wg-stark-bay');
  assert.equal(second.isDragon, first.isDragon);
  assert.equal(second.cached, true);
});

test('e2) enterCity borra dragonRolls', () => {
  const state = freshState('western-glades');
  state.visited = ['western-glades', 'arvandill'];
  startTrip(state, 'starkrock', 100, true, false, null);
  state.trip.progress = 100;
  state.dragonRolls = { 'wg-stark-bay': true };

  assert.equal(enterCity(state), true);
  assert.deepEqual(state.dragonRolls, {});
  assert.equal(state.trip, null);
  assert.equal(state.currentCity, 'starkrock');
  assert.ok(state.visited.includes('starkrock'));
});

test('f) exploreCity: falla sin saldo y sin ciudad visitada; funciona con saldo', () => {
  const costo = exploreCost(world);
  assert.equal(costo, 40); // 10 × 4

  // sin ciudad visitada
  const sinVisitar = freshState('starkrock');
  assert.equal(exploreCity(world, sinVisitar, 100), false);
  assert.equal(sinVisitar.spent, 0);
  assert.deepEqual(sinVisitar.explored, []);

  // sin saldo suficiente
  const sinSaldo = freshState('arvandill');
  assert.equal(exploreCity(world, sinSaldo, costo - 1), false);
  assert.equal(sinSaldo.spent, 0);
  assert.deepEqual(sinSaldo.explored, []);

  // con saldo: funciona y descuenta el costo
  const ok = freshState('arvandill');
  assert.equal(exploreCity(world, ok, 100), true);
  assert.equal(ok.spent, costo);
  assert.deepEqual(ok.explored, ['arvandill']);
});

test('g) settleArrival con plan "viajar, entrar y explorar"', () => {
  const state = freshState();
  startTrip(state, 'sandquill', 100, false, true, null);
  flowBalanceToTrip(state, 100); // viaje completo

  assert.equal(settleArrival(state), true);
  assert.equal(state.currentCity, 'sandquill');
  assert.ok(state.visited.includes('sandquill'));
  assert.ok(state.explored.includes('sandquill'));
  assert.equal(state.trip, null);
});

test('h) markerPosition: 0% origen, 100% destino, 50% entre ambos', () => {
  const origen = cities.arvandill;
  const destino = cities.starkrock;
  const state = freshState();
  startTrip(state, 'starkrock', 132, false, false, route('arv-stark'));

  state.trip.progress = 0;
  assert.deepEqual(markerPosition(world, state), { x: origen.x, y: origen.y });

  state.trip.progress = 132;
  assert.deepEqual(markerPosition(world, state), { x: destino.x, y: destino.y });

  state.trip.progress = 66; // 50%
  const mitad = markerPosition(world, state);
  const [xMin, xMax] = [Math.min(origen.x, destino.x), Math.max(origen.x, destino.x)];
  const [yMin, yMax] = [Math.min(origen.y, destino.y), Math.max(origen.y, destino.y)];
  assert.ok(mitad.x > xMin && mitad.x < xMax, `x=${mitad.x} no está entre ${xMin} y ${xMax}`);
  assert.ok(mitad.y > yMin && mitad.y < yMax, `y=${mitad.y} no está entre ${yMin} y ${yMax}`);
});

// P6 — Costos derivados del largo del trazado (sin points manual en world.json).
test('P6) costos derivados: total 282, enteros y más corto = más barato', () => {
  const total = world.routes.reduce((sum, r) => sum + r.points, 0);
  assert.equal(total, 282); // el total se mantiene en 282 (3.827 px ÷ 13,6)

  for (const r of world.routes) {
    assert.ok(Number.isInteger(r.points) && r.points > 0, `ruta ${r.id}: points = ${r.points}`);
  }

  // Bahía (260 px) más barata que Bosque (401 px): mantiene la elección.
  assert.ok(route('arv-sand-bay').points < route('arv-sand').points);

  // La ruta más corta en px (arv-vorn, 233) es la más barata.
  const cheapest = world.routes.reduce((min, r) => (r.points < min.points ? r : min));
  assert.equal(cheapest.id, 'arv-vorn');
});

// M3 — Sin la regla de medición no se puede hidratar el mapa: se falla fuerte
// (antes quedaban rutas sin points y NaN en pantalla).
test('M3: falta imageSize o no es válido → Error que nombra el campo', () => {
  const sinImage = structuredClone(world);
  delete sinImage.imageSize;
  assert.throws(() => hydrateRouteCosts(sinImage), /imageSize/);

  const anchoCero = structuredClone(world);
  anchoCero.imageSize = { width: 0, height: 1121 };
  assert.throws(() => hydrateRouteCosts(anchoCero), /imageSize/);

  const altoRaro = structuredClone(world);
  altoRaro.imageSize = { width: 963, height: 'alto' };
  assert.throws(() => hydrateRouteCosts(altoRaro), /imageSize/);
});

test('M3: pxPerPoint ausente o no positivo → Error que nombra el campo', () => {
  const sinPp = structuredClone(world);
  delete sinPp.pxPerPoint;
  assert.throws(() => hydrateRouteCosts(sinPp), /pxPerPoint/);

  const cero = structuredClone(world);
  cero.pxPerPoint = 0;
  assert.throws(() => hydrateRouteCosts(cero), /pxPerPoint/);

  const negativo = structuredClone(world);
  negativo.pxPerPoint = -13.6;
  assert.throws(() => hydrateRouteCosts(negativo), /pxPerPoint/);
});

test('M3: ruta con ciudad inexistente → Error que nombra la ruta', () => {
  const toRaro = structuredClone(world);
  toRaro.routes[0] = { ...toRaro.routes[0], to: 'ciudad-fantasma' };
  assert.throws(() => hydrateRouteCosts(toRaro), /arv-vorn/);
  assert.throws(() => hydrateRouteCosts(toRaro), /ciudad-fantasma/);

  const fromRaro = structuredClone(world);
  fromRaro.routes[2] = { ...fromRaro.routes[2], from: 'ninguna' };
  assert.throws(() => hydrateRouteCosts(fromRaro), /arv-sand-bay/);
});

test('M3: el world.json real sigue hidratando bien', () => {
  const raw = JSON.parse(
    readFileSync(new URL('../data/world.json', import.meta.url), 'utf8'),
  );
  const hidratado = hydrateRouteCosts(raw);
  let total = 0;
  for (const r of hidratado.routes) {
    assert.ok(Number.isInteger(r.points) && r.points > 0, `ruta ${r.id}: points = ${r.points}`);
    total += r.points;
  }
  assert.equal(total, 282);
});
