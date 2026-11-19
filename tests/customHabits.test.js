// V2 / Bloque 3 (Pieza 2) — Hábitos propios: lógica y datos, sin pantalla.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetLocalStorage } from './helpers/localStorage.js';
import { CUSTOM_HABITS_KEY } from '../js/config.js';
import { loadCustomHabits } from '../js/storage.js';
import {
  getTodayKey,
  getHabitsData,
  migrateDaysData,
  sendPastDays,
  computeDayPoints,
  computeTotalSent,
} from '../js/habits.js';
import {
  MAX_SLOTS,
  validateFields,
  nextCustomId,
  occupiedSlots,
  activeCustomHabits,
  createCustomHabit,
  editCustomHabit,
  archiveCustomHabit,
  isValidCustomHabitsList,
} from '../js/customHabits.js';

const activeHabits = JSON.parse(
  readFileSync(new URL('../data/habits.json', import.meta.url), 'utf8'),
).habits;
const ejercicio = activeHabits.find((h) => h.id === 'ejercicio');
const today = getTodayKey();
const oldDay = '2000-01-01';

function fields(label = 'Leer', minDesc = '5 minutos', fullDesc = '20 minutos') {
  return { label, minDesc, fullDesc };
}

function custom(id, label = 'Leer', archivedDate = null) {
  return {
    id,
    label,
    minDesc: '5 minutos',
    fullDesc: '20 minutos',
    minPoints: 1,
    fullPoints: 3,
    style: 'direct',
    archived: archivedDate !== null,
    archivedDate,
  };
}

function storedCustoms() {
  return JSON.parse(localStorage.getItem(CUSTOM_HABITS_KEY));
}

beforeEach(() => {
  resetLocalStorage();
});

test('validateFields: recorta espacios y rechaza vacíos y demasiado largos', () => {
  assert.deepEqual(validateFields(fields('  Leer  ', '  5 min ', ' 20 min ')), {
    ok: true,
    label: 'Leer',
    minDesc: '5 min',
    fullDesc: '20 min',
  });
  assert.equal(validateFields(fields('', 'a', 'b')).reason, 'label');
  assert.equal(validateFields(fields('a', '  ', 'b')).reason, 'minDesc');
  assert.equal(validateFields(fields('a', 'b', '   ')).reason, 'fullDesc');
  assert.equal(validateFields(fields('x'.repeat(31), 'b', 'c')).reason, 'label');
  assert.equal(validateFields(fields('a', 'x'.repeat(41), 'c')).reason, 'minDesc');
  assert.equal(validateFields(fields('a', 'b', 'x'.repeat(41))).reason, 'fullDesc');
  assert.equal(validateFields(null).reason, 'label');
});

test('crear: forma fija, id custom-n y persistencia', () => {
  const created = createCustomHabit([], fields());
  assert.equal(created.ok, true);
  assert.deepEqual(created.habit, custom('custom-1'));
  assert.equal(created.customs.length, 1);
  assert.deepEqual(loadCustomHabits(), [custom('custom-1')]);

  // El id nunca se reutiliza, ni después de archivar.
  assert.equal(nextCustomId([custom('custom-1'), custom('custom-7')]), 'custom-8');
  assert.equal(nextCustomId([]), 'custom-1');
  assert.equal(nextCustomId([{ id: 'otro' }]), 'custom-1');
});

test('tope de 3: cuentan activos + archivados hoy; archivado ayer libera lugar', () => {
  const archivedToday = [custom('custom-1', 'A', today), custom('custom-2', 'B', today)];
  assert.equal(occupiedSlots(archivedToday, today), 2);
  assert.deepEqual(activeCustomHabits(archivedToday), []);
  assert.equal(occupiedSlots([...archivedToday, custom('custom-3', 'Hoy libre', oldDay)], today), 2);

  const full = [
    custom('custom-1'),
    custom('custom-2'),
    custom('custom-3', 'A', today),
  ];
  assert.equal(occupiedSlots(full, today), MAX_SLOTS);
  const rejected = createCustomHabit(full, fields('Cuarto'));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'full');
  assert.strictEqual(rejected.customs, full);
  assert.deepEqual(loadCustomHabits(), []); // rechazar no escribe nada

  // Con un archivado de ayer sí entra el cuarto.
  const withFreedSlot = [...full.slice(0, 2), custom('custom-3', 'Ayer', oldDay)];
  const created = createCustomHabit(withFreedSlot, fields('Cuarto'));
  assert.equal(created.ok, true);
  assert.equal(created.habit.id, 'custom-4');
});

test('editar: solo nombre y descripciones; id, puntos y estilo quedan fijos', () => {
  const [first] = [custom('custom-1')];
  const edited = editCustomHabit([first], 'custom-1', fields('Otro', '1 min', '10 min'));
  assert.equal(edited.ok, true);
  assert.deepEqual(
    edited.habit,
    { ...custom('custom-1'), label: 'Otro', minDesc: '1 min', fullDesc: '10 min' },
  );
  assert.equal(edited.habit.minPoints, 1);
  assert.equal(edited.habit.fullPoints, 3);
  assert.equal(edited.habit.style, 'direct');

  assert.equal(editCustomHabit([first], 'custom-9', fields()).reason, 'missing');
  assert.equal(editCustomHabit([custom('custom-1', 'Viejo', today)], 'custom-1', fields()).reason, 'archived');
  assert.equal(editCustomHabit([first], 'custom-1', fields('', 'a', 'b')).reason, 'label');
  assert.deepEqual(loadCustomHabits(), [edited.habit]);
});

test('archivar: auto-envía SOLO ese hábito de hoy y deja los fijos sin bloquear', () => {
  const customs = [custom('custom-1'), custom('custom-2')];
  const daysData = {
    schemaVersion: 3,
    days: {
      [oldDay]: {
        'custom-1': { level: 2, points: 3, sentPoints: 0 }, // historial viejo: no se toca
      },
      [today]: {
        ejercicio: { level: 2, points: 3, sentPoints: 0 }, // fijo pendiente
        'custom-1': { level: 1, points: 1, sentPoints: 0 }, // se archiva
        'custom-2': { level: 2, points: 3, sentPoints: 0 }, // otro propio, queda
      },
    },
  };

  const result = archiveCustomHabit(customs, daysData, 'custom-1', today);
  assert.equal(result.ok, true);
  assert.deepEqual(result.habit, custom('custom-1', 'Leer', today));
  assert.equal(occupiedSlots(result.customs, today), 2); // el archivado hoy sigue ocupando

  const sentDay = result.daysData.days[today];
  assert.deepEqual(sentDay['custom-1'], { level: 1, points: 1, sentPoints: 1 });
  assert.deepEqual(sentDay.ejercicio, { level: 2, points: 3, sentPoints: 0 }); // NO bloqueado
  assert.deepEqual(sentDay['custom-2'], { level: 2, points: 3, sentPoints: 0 }); // NO tocado
  assert.deepEqual(
    result.daysData.days[oldDay]['custom-1'],
    { level: 2, points: 3, sentPoints: 0 }, // historial intacto
  );

  // Ambos datos quedaron guardados (lista con archivedDate + días con sentPoints).
  assert.deepEqual(storedCustoms(), result.customs);
  assert.deepEqual(JSON.parse(localStorage.getItem('habitQuest:data:v1')).days[today], sentDay);

  // No se puede archivar dos veces.
  assert.equal(archiveCustomHabit(result.customs, result.daysData, 'custom-1', today).reason, 'archived');
});

test('archivar sin pendientes no cambia days y el id no se reutiliza', () => {
  const first = custom('custom-1');
  const daysData = { schemaVersion: 3, days: { [today]: { 'custom-1': { level: 0, points: 0, sentPoints: 0 } } } };
  const archived = archiveCustomHabit([first], daysData, 'custom-1', today);
  assert.strictEqual(archived.daysData, daysData);
  assert.deepEqual(activeCustomHabits(archived.customs), []);
  assert.equal(nextCustomId(archived.customs), 'custom-2');
});

test('getHabitsData: agrega los activos y excluye los archivados sin escribir habits.json', async () => {
  const originalFetch = globalThis.fetch;
  const raw = readFileSync(new URL('../data/habits.json', import.meta.url), 'utf8');
  localStorage.setItem(
    CUSTOM_HABITS_KEY,
    JSON.stringify([custom('custom-2', 'Nuevo'), custom('custom-1', 'Viejo', today)]),
  );
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(raw) });
  try {
    const data = await getHabitsData();
    const ids = data.habits.map((h) => h.id);
    assert.ok(ids.includes('ejercicio'));
    assert.ok(ids.includes('custom-2'));
    assert.ok(!ids.includes('custom-1'));
    assert.equal(data.habits.find((h) => h.id === 'custom-2').fullPoints, 3);
    assert.equal(localStorage.getItem('data/habits.json'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getHabitsData: una entrada corrupta en customHabits no impide arrancar', async () => {
  const originalFetch = globalThis.fetch;
  const raw = readFileSync(new URL('../data/habits.json', import.meta.url), 'utf8');
  const fixedCount = JSON.parse(raw).habits.length;
  localStorage.setItem(
    CUSTOM_HABITS_KEY,
    JSON.stringify([null, 'basura', 7, [], custom('custom-1')]),
  );
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(raw) });
  try {
    const data = await getHabitsData();
    assert.equal(data.habits.length, fixedCount + 1);
    assert.ok(data.habits.some((habit) => habit.id === 'custom-1'));
    assert.ok(data.habits.every((habit) => typeof habit === 'object' && habit !== null));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ids archivados: migrateDaysData, sendPastDays y computeDayPoints no los descartan ni alteran', () => {
  // custom-1 NO está en activeHabits (está archivado) pero sus entradas siguen en days.
  const v2 = {
    schemaVersion: 2,
    days: {
      [oldDay]: {
        ejercicio: { level: 2, points: 3, sentPoints: 0 },
        'custom-1': { level: 2, points: 3, sentPoints: 0 },
      },
      [today]: {
        ejercicio: { level: 1, points: 1, sentPoints: 0 },
        'custom-1': { level: 1, points: 1, sentPoints: 1 },
      },
    },
  };

  // 1) La migración itera TODAS las entradas del día, no solo los hábitos activos.
  const migrated = migrateDaysData(v2, activeHabits);
  assert.deepEqual(Object.keys(migrated.days[oldDay]).sort(), ['custom-1', 'ejercicio']);
  assert.deepEqual(migrated.days[oldDay]['custom-1'], { level: 2, points: 3, sentPoints: 0 });
  assert.deepEqual(migrated.days[today]['custom-1'], { level: 1, points: 1, sentPoints: 1 });

  // 2) sendPastDays completa los pendientes viejos del id archivado sin borrarlo.
  const sent = sendPastDays(migrated);
  assert.deepEqual(sent.days[oldDay]['custom-1'], { level: 2, points: 3, sentPoints: 3 });
  assert.deepEqual(sent.days[today]['custom-1'], { level: 1, points: 1, sentPoints: 1 });

  // 3) computeDayPoints solo mira la lista activa: el archivado sale de
  // "Puntos de hoy", pero no muta levelsByHabit (el dato sigue intacto).
  const levelsByHabit = sent.days[today];
  const before = structuredClone(levelsByHabit);
  const resumen = computeDayPoints(levelsByHabit, activeHabits);
  assert.equal('custom-1' in resumen.pointsByHabit, false); // no entra en "Puntos de hoy"
  assert.equal(resumen.pointsByHabit.ejercicio, 1);
  assert.equal(resumen.pending, 1); // el punto del archivado NO cuenta hoy
  assert.deepEqual(levelsByHabit, before); // ni se alteró su entrada

  // 4) En cambio el saldo SÍ conserva los puntos del id archivado (3 viejos + 1 de hoy).
  assert.equal(computeTotalSent(sent), 7);
});

test('isValidCustomHabitsList: exige forma y archivedDate null o YYYY-MM-DD', () => {
  assert.equal(isValidCustomHabitsList([custom('custom-1'), custom('custom-2', 'Viejo', oldDay)]), true);
  assert.equal(isValidCustomHabitsList([]), true);
  assert.equal(isValidCustomHabitsList('no-lista'), false);
  assert.equal(isValidCustomHabitsList([custom('custom-1'), custom('custom-1')]), false); // id repetido
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archivedDate: undefined }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archivedDate: '01/01/2000' }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archivedDate: '2000-1-1' }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archivedDate: 20000101 }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archivedDate: oldDay }]), false); // activo con fecha
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), minPoints: 2 }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), fullPoints: 2 }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), style: 'number' }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), archived: 'si' }]), false);
  assert.equal(isValidCustomHabitsList([{ ...custom('custom-1'), label: '' }]), false);
  // Más de 3 ocupantes del día.
  assert.equal(
    isValidCustomHabitsList([custom('custom-1'), custom('custom-2'), custom('custom-3'), custom('custom-4')]),
    false,
  );
});
