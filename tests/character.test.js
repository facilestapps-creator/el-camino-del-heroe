// V2 / Bloque 1 (Pieza 4) — Personaje: catálogo, estado y reglas. Sin pantalla.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetLocalStorage } from './helpers/localStorage.js';
import { CHARACTER_KEY } from '../js/config.js';
import { loadCharacterState, saveCharacterState } from '../js/storage.js';
import { settleArrival } from '../js/world.js';
import {
  isValidCharacterState,
  getBag,
  generateOffer,
  equipItem,
  clearOffer,
  visibleOffer,
  syncOfferOnCityChange,
  equippedBySlot,
} from '../js/character.js';

const catalog = JSON.parse(
  readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'),
);
const makeState = (equipped = {}, offer = null) => ({ equipped, offer });

beforeEach(() => {
  resetLocalStorage();
});

test('isValidCharacterState: solo forma (ids desconocidos incluidos)', () => {
  assert.equal(isValidCharacterState(makeState()), true);
  assert.equal(isValidCharacterState(makeState(
    { casco: 'casco-01', armadura: null },
    { cityId: 'arvandill', itemIds: ['pieza-que-ya-no-existe'] },
  )), true);
  assert.equal(isValidCharacterState(null), false);
  assert.equal(isValidCharacterState([]), false);
  assert.equal(isValidCharacterState({ equipped: [], offer: null }), false);
  assert.equal(isValidCharacterState({ equipped: { casco: 3 }, offer: null }), false);
  assert.equal(isValidCharacterState({ equipped: {}, offer: { itemIds: [] } }), false);
  assert.equal(isValidCharacterState({ equipped: {}, offer: { cityId: 'x', itemIds: 1 } }), false);
  assert.equal(isValidCharacterState({ equipped: {}, offer: { cityId: 'x', itemIds: [2] } }), false);
});

test('getBag: excluye lo puesto y lo ofrecido; ignora ids desconocidos', () => {
  const state = makeState(
    { casco: 'casco-01' },
    { cityId: 'arvandill', itemIds: ['armadura-01'] },
  );
  const bag = getBag(state, catalog);
  assert.equal(bag.length, catalog.items.length - 2);
  assert.ok(!bag.some((item) => item.id === 'casco-01'));
  assert.ok(!bag.some((item) => item.id === 'armadura-01'));

  const withUnknown = getBag(makeState(
    { casco: 'id-inexistente' },
    { cityId: 'arvandill', itemIds: ['otro-inexistente'] },
  ), catalog);
  assert.equal(withUnknown.length, catalog.items.length);
});

test('generateOffer con rng=0: una pieza determinista y estado sin mutar', () => {
  const state = makeState({ casco: 'casco-01' });
  const snapshot = structuredClone(state);
  const expectedFirst = getBag(state, catalog)[0].id;
  const result = generateOffer(state, catalog, 'arvandill', () => 0);
  assert.equal(result.state.offer.cityId, 'arvandill');
  assert.deepEqual(result.state.offer.itemIds, [expectedFirst]);
  assert.deepEqual(result.state.equipped, { casco: 'casco-01' });
  assert.deepEqual(state, snapshot);
});

test('generateOffer con rng alto: tres piezas distintas de la bolsa', () => {
  const rng = () => 0.999999;
  const state = makeState({ casco: 'casco-01' });
  const bagIds = getBag(state, catalog).map((item) => item.id);
  const { itemIds } = generateOffer(state, catalog, 'vornstead', rng).state.offer;
  assert.equal(itemIds.length, 3);
  assert.equal(new Set(itemIds).size, 3);
  for (const id of itemIds) {
    assert.ok(bagIds.includes(id), `${id} no estaba en la bolsa`);
  }
});

test('generateOffer con rng variable: entre 1 y 3, sin repetidos ni puestos', () => {
  const sequence = [0.5, 0.2, 0.7, 0.1, 0.9, 0.4, 0.3];
  const rng = () => sequence.shift() ?? 0;
  const state = makeState({ armadura: 'armadura-02' });
  const bagIds = getBag(state, catalog).map((item) => item.id);
  const { itemIds } = generateOffer(state, catalog, 'arvandill', rng).state.offer;
  assert.ok(itemIds.length >= 1 && itemIds.length <= 3);
  assert.equal(new Set(itemIds).size, itemIds.length);
  for (const id of itemIds) {
    assert.ok(bagIds.includes(id));
    assert.notEqual(id, 'armadura-02');
  }
});

test('generateOffer ignora la oferta anterior: sus piezas pueden volver a salir', () => {
  const initial = makeState();
  const first = generateOffer(initial, catalog, 'arvandill', () => 0).state;
  const previousIds = first.offer.itemIds;
  assert.ok(getBag({ ...first, offer: null }, catalog).some((item) => item.id === previousIds[0]));

  const second = generateOffer(first, catalog, 'vornstead', () => 0).state;
  assert.deepEqual(second.offer.itemIds, previousIds);
  assert.equal(first.offer.cityId, 'arvandill'); // no se mutó la oferta vieja
});

test('generateOffer con la bolsa vacía devuelve itemIds vacío', () => {
  // Con 6 casilleros no se pueden tener las 12 piezas puestas a la vez:
  // se usa un catálogo reducido para dejar la bolsa realmente vacía.
  const tinyCatalog = { slots: catalog.slots, items: [catalog.items[0]] };
  const state = makeState({ casco: 'casco-01' });
  assert.equal(getBag(state, tinyCatalog).length, 0);
  const { state: offered } = generateOffer(state, tinyCatalog, 'arvandill', () => 0);
  assert.deepEqual(offered.offer, { cityId: 'arvandill', itemIds: [] });
});

test('equipItem: reemplaza el casillero, saca la pieza de la oferta y devuelve la anterior a la bolsa', () => {
  const state = makeState(
    { casco: 'casco-01' },
    { cityId: 'arvandill', itemIds: ['casco-02', 'armadura-01'] },
  );
  const snapshot = structuredClone(state);
  const result = equipItem(state, catalog, 'casco-02');
  assert.equal(result.ok, true);
  assert.equal(result.item.slot, 'casco');
  assert.equal(result.state.equipped.casco, 'casco-02');
  assert.deepEqual(result.state.offer.itemIds, ['armadura-01']);
  assert.ok(getBag(result.state, catalog).some((item) => item.id === 'casco-01'));
  assert.deepEqual(state, snapshot);
});

test('equipItem: id desconocido o fuera de la oferta no cambia nada', () => {
  const state = makeState({}, { cityId: 'arvandill', itemIds: ['casco-01'] });
  const snapshot = structuredClone(state);
  const unknown = equipItem(state, catalog, 'pieza-inexistente');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'notInOffer');
  assert.deepEqual(unknown.state, snapshot);

  const withUnknownInOffer = makeState({}, {
    cityId: 'arvandill',
    itemIds: ['pieza-inexistente'],
  });
  const missing = equipItem(withUnknownInOffer, catalog, 'pieza-inexistente');
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'unknown');
  assert.deepEqual(missing.state, withUnknownInOffer);
});

test('clearOffer: borra la oferta y conserva lo equipado', () => {
  const state = makeState(
    { casco: 'casco-01' },
    { cityId: 'arvandill', itemIds: ['armadura-01'] },
  );
  const cleared = clearOffer(state);
  assert.equal(cleared.offer, null);
  assert.deepEqual(cleared.equipped, { casco: 'casco-01' });
  assert.ok(getBag(cleared, catalog).some((item) => item.id === 'armadura-01'));
  assert.notEqual(state.offer, null);
});

test('loadCharacterState normaliza datos malformados sin lanzar; saveCharacterState persiste', () => {
  assert.deepEqual(loadCharacterState(), { equipped: {}, offer: null });

  const valid = makeState({ casco: 'pieza-inexistente' }, {
    cityId: 'arvandill',
    itemIds: ['casco-01'],
  });
  saveCharacterState(valid);
  assert.deepEqual(loadCharacterState(), valid);
  assert.deepEqual(JSON.parse(localStorage.getItem(CHARACTER_KEY)), valid);

  localStorage.setItem(CHARACTER_KEY, JSON.stringify({ equipped: { casco: 7 }, offer: null }));
  assert.deepEqual(loadCharacterState(), { equipped: {}, offer: null });

  localStorage.setItem(CHARACTER_KEY, '{');
  const originalWarn = console.warn;
  console.warn = () => {}; // loadFromStorage avisa del JSON roto; acá solo importa no lanzar
  try {
    assert.doesNotThrow(() => loadCharacterState());
    assert.deepEqual(loadCharacterState(), { equipped: {}, offer: null });
  } finally {
    console.warn = originalWarn;
  }
});

// V2 / Pieza 5 — la oferta solo se muestra en la ciudad actual y sin viaje.
test('visibleOffer: solo con cityId actual y sin viaje en curso', () => {
  const offer = { cityId: 'arvandill', itemIds: ['casco-01'] };
  const character = makeState({}, offer);
  assert.deepEqual(visibleOffer(character, { currentCity: 'arvandill', trip: null }), offer);
  assert.equal(visibleOffer(character, { currentCity: 'vornstead', trip: null }), null);
  assert.equal(visibleOffer(character, {
    currentCity: 'arvandill',
    trip: { dest: 'vornstead' },
  }), null);
  assert.equal(visibleOffer(makeState(), { currentCity: 'arvandill', trip: null }), null);
});

test('syncOfferOnCityChange: sin cambio de ciudad no hace nada (idempotencia)', () => {
  const character = makeState({}, { cityId: 'arvandill', itemIds: ['casco-01'] });
  const result = syncOfferOnCityChange({
    previousCityId: 'arvandill',
    worldState: { currentCity: 'arvandill', trip: null },
    characterState: character,
    catalog,
    arrivingTrip: { dest: 'arvandill', withExplore: true },
    rng: () => 0,
  });
  assert.equal(result.changed, false);
  assert.equal(result.characterState, character);
  assert.deepEqual(result.characterState.offer, character.offer);
});

test('syncOfferOnCityChange: cambia de ciudad → limpia; con viaje con explorar genera la nueva', () => {
  const character = makeState(
    { casco: 'casco-01' },
    { cityId: 'arvandill', itemIds: ['armadura-01'] },
  );
  const worldState = { currentCity: 'vornstead', trip: null };
  const result = syncOfferOnCityChange({
    previousCityId: 'arvandill',
    worldState,
    characterState: character,
    catalog,
    arrivingTrip: { dest: 'vornstead', withExplore: true },
    rng: () => 0,
  });
  assert.equal(result.changed, true);
  assert.equal(result.previousCityId, 'vornstead');
  assert.equal(result.characterState.offer.cityId, 'vornstead');
  assert.equal(result.characterState.offer.itemIds.length, 1);
  assert.deepEqual(result.characterState.equipped, { casco: 'casco-01' });
  assert.equal(character.offer.cityId, 'arvandill'); // no mutó el estado de entrada

  // Aplicarlo de nuevo con el previousCityId devuelto no genera otra oferta.
  const again = syncOfferOnCityChange({
    previousCityId: result.previousCityId,
    worldState,
    characterState: result.characterState,
    catalog,
    arrivingTrip: { dest: 'vornstead', withExplore: true },
    rng: () => 0,
  });
  assert.equal(again.changed, false);
  assert.equal(again.characterState, result.characterState);
  assert.deepEqual(again.characterState.offer, result.characterState.offer);
});

test('syncOfferOnCityChange: viaje normal no genera oferta; cancelar viaje la mantiene', () => {
  const character = makeState({}, { cityId: 'arvandill', itemIds: ['casco-01'] });
  const normal = syncOfferOnCityChange({
    previousCityId: 'arvandill',
    worldState: { currentCity: 'vornstead', trip: { dest: 'vornstead', withExplore: false } },
    characterState: character,
    catalog,
    arrivingTrip: { dest: 'vornstead', withExplore: false },
    rng: () => 0,
  });
  assert.equal(normal.changed, true);
  assert.equal(normal.characterState.offer, null);

  // Cancelar: currentCity NO cambia → la oferta sigue intacta.
  const cancel = syncOfferOnCityChange({
    previousCityId: 'arvandill',
    worldState: { currentCity: 'arvandill', trip: null },
    characterState: character,
    catalog,
    arrivingTrip: null,
    rng: () => 0,
  });
  assert.equal(cancel.changed, false);
  assert.deepEqual(cancel.characterState.offer, character.offer);
});

test('syncOfferOnCityChange: viaje completado con la app cerrada se detecta al abrir', () => {
  // estado guardado: el viaje ya llegó pero settleArrival todavía no corrió.
  const savedWorld = {
    currentCity: 'arvandill',
    visited: ['arvandill'],
    explored: [],
    trip: { dest: 'vornstead', cost: 100, progress: 100, withExplore: true },
  };
  const previousCityId = savedWorld.currentCity; // se inicializa antes del primer refresh
  const trip = savedWorld.trip;
  const arrivingTrip = { dest: trip.dest, withExplore: trip.withExplore };

  settleArrival(savedWorld); // lo que hace el primer refresh() de app.js
  const result = syncOfferOnCityChange({
    previousCityId,
    worldState: savedWorld,
    characterState: makeState(),
    catalog,
    arrivingTrip,
    rng: () => 0,
  });
  assert.equal(savedWorld.currentCity, 'vornstead');
  assert.ok(savedWorld.explored.includes('vornstead'));
  assert.equal(result.characterState.offer.cityId, 'vornstead');
  assert.equal(result.characterState.offer.itemIds.length, 1);
});

// V2 / Pieza 6 — vista Personaje: una entrada por casillero, en orden, sin tocar el estado.
test('equippedBySlot: vacío → todos los casilleros con item null, en orden de catalog.slots', () => {
  const result = equippedBySlot(makeState(), catalog);
  assert.deepEqual(result.map((entry) => entry.slot.id), catalog.slots.map((slot) => slot.id));
  assert.ok(result.every((entry) => entry.item === null));
  assert.equal(result.length, 6);
});

test('equippedBySlot: pieza válida → item en su casillero, los demás vacíos', () => {
  const state = makeState({ casco: 'casco-01', calzado: 'calzado-02' });
  const result = equippedBySlot(state, catalog);
  const byId = new Map(result.map((entry) => [entry.slot.id, entry.item]));
  assert.equal(byId.get('casco').id, 'casco-01');
  assert.equal(byId.get('calzado').id, 'calzado-02');
  assert.equal(byId.get('armadura'), null);
  assert.deepEqual(state, makeState({ casco: 'casco-01', calzado: 'calzado-02' })); // no muta
});

test('equippedBySlot: id desconocido o de otro casillero → casillero vacío sin romper', () => {
  const result = equippedBySlot(makeState({
    casco: 'pieza-que-ya-no-existe',
    armadura: 'calzado-01', // id válido, pero guardado en el casillero equivocado
  }), catalog);
  const byId = new Map(result.map((entry) => [entry.slot.id, entry.item]));
  assert.equal(byId.get('casco'), null);
  assert.equal(byId.get('armadura'), null);
  assert.equal(byId.get('calzado'), null);
  assert.equal(result.length, catalog.slots.length);
});

test('equippedBySlot: catálogo sin slots/items o estado sin equipped → solo vacíos, sin lanzar', () => {
  assert.deepEqual(equippedBySlot(makeState(), { slots: [], items: [] }), []);
  assert.deepEqual(equippedBySlot(null, null), []);
});
