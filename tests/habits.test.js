// M2 — Lógica de hábitos: pendientes, envío, pasos, validación y migración.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetLocalStorage } from './helpers/localStorage.js';
import {
  getTodayKey,
  saveTodayLevel,
  sendTodayPoints,
  sendPastDays,
  computeDayPoints,
  computeTotalSent,
  validateSteps,
  saveSteps,
  migrateDaysData,
} from '../js/habits.js';

const habitsData = JSON.parse(
  readFileSync(new URL('../data/habits.json', import.meta.url), 'utf8'),
);
const habits = habitsData.habits;
const { stepsPerPoint, maxSteps } = habitsData;
const ejercicio = habits.find((h) => h.id === 'ejercicio');

beforeEach(() => {
  resetLocalStorage();
});

test('a) hábito marcado sin enviar: pendiente = puntos y saldo = 0', () => {
  const days = saveTodayLevel({ days: {} }, 'ejercicio', 2, ejercicio);
  const day = days.days[getTodayKey()];
  assert.deepEqual(day.ejercicio, { level: 2, points: 3, sentPoints: 0 });

  const resumen = computeDayPoints(day, habits);
  assert.equal(resumen.total, 3);
  assert.equal(resumen.sent, 0);
  assert.equal(resumen.pending, 3); // pendiente = puntos del hábito
  assert.equal(computeTotalSent(days), 0); // saldo = 0
});

test('b) enviar: saldo = puntos; después saveTodayLevel no cambia nada', () => {
  let days = saveTodayLevel({ days: {} }, 'ejercicio', 2, ejercicio);
  assert.equal(computeTotalSent(days), 0);

  days = sendTodayPoints(days);
  assert.deepEqual(days.days[getTodayKey()].ejercicio, { level: 2, points: 3, sentPoints: 3 });
  assert.equal(computeTotalSent(days), 3); // saldo = puntos del hábito

  // hábito bloqueado tras el envío: el nivel no se modifica
  const bloqueado = saveTodayLevel(days, 'ejercicio', 1, ejercicio);
  assert.strictEqual(bloqueado, days);
  assert.deepEqual(bloqueado.days[getTodayKey()].ejercicio, { level: 2, points: 3, sentPoints: 3 });
});

test('c) pasos acumulativos: 3000 = 4 pts; enviar; 5000 = 7 pts y 3 pendientes', () => {
  let days = saveSteps({ days: {} }, 'pasos', 3000, stepsPerPoint, maxSteps);
  assert.deepEqual(days.days[getTodayKey()].pasos, { steps: 3000, points: 4, sentPoints: 0 });

  days = sendTodayPoints(days);
  assert.equal(days.days[getTodayKey()].pasos.sentPoints, 4);

  days = saveSteps(days, 'pasos', 5000, stepsPerPoint, maxSteps);
  const day = days.days[getTodayKey()];
  assert.deepEqual(day.pasos, { steps: 5000, points: 7, sentPoints: 4 });

  const resumen = computeDayPoints(day, habits);
  assert.equal(resumen.total, 7);
  assert.equal(resumen.sent, 4);
  assert.equal(resumen.pending, 3); // pendiente 3
});

test('d) validateSteps: mínimo = sentPoints × stepsPerPoint y tope 30000', () => {
  const entry = { sentPoints: 4 };
  const min = 4 * stepsPerPoint; // 2800

  const bajoMin = validateSteps(entry, min - 1, stepsPerPoint, maxSteps);
  assert.equal(bajoMin.ok, false);
  assert.equal(bajoMin.reason, 'min');
  assert.equal(bajoMin.min, min);

  assert.equal(validateSteps(entry, min, stepsPerPoint, maxSteps).ok, true);
  assert.equal(validateSteps(null, maxSteps, stepsPerPoint, maxSteps).ok, true); // 30000 válido

  const sobreTope = validateSteps(null, maxSteps + 1, stepsPerPoint, maxSteps); // 30001
  assert.equal(sobreTope.ok, false);
  assert.equal(sobreTope.reason, 'max');
  assert.equal(sobreTope.max, maxSteps);
});

test('d2) saveSteps rechaza valores inválidos sin cambiar nada', () => {
  const today = getTodayKey();
  const days = {
    schemaVersion: 3,
    days: { [today]: { pasos: { steps: 3000, points: 4, sentPoints: 4 } } },
  };

  const rechazado = saveSteps(days, 'pasos', 30001, stepsPerPoint, maxSteps);
  assert.strictEqual(rechazado, days); // devuelve daysData sin cambios
  assert.deepEqual(days.days[today].pasos, { steps: 3000, points: 4, sentPoints: 4 });
  assert.equal(localStorage.getItem('habitQuest:data:v1'), null); // no escribió nada
});

test('e) migración v1 → v3 conserva los puntos', () => {
  const v1 = { schemaVersion: 1, days: { '2000-01-01': { agua: 2, pasos: 1 } } };
  const migrado = migrateDaysData(v1, habits);

  assert.equal(migrado.schemaVersion, 3);
  const day = migrado.days['2000-01-01'];
  assert.deepEqual(day.agua, { level: 2, points: 3, sentPoints: 3 }); // fullPoints = 3
  assert.deepEqual(day.pasos, { steps: 2500, points: 1, sentPoints: 1 }); // level 1 → 2500, 1 pt
});

test('e2) migración v2 → v3 conserva los puntos', () => {
  const v2 = {
    schemaVersion: 2,
    days: { '2000-01-01': { ejercicio: { level: 2, points: 3 } } },
  };
  const migrado = migrateDaysData(v2, habits);

  assert.equal(migrado.schemaVersion, 3);
  assert.deepEqual(migrado.days['2000-01-01'].ejercicio, { level: 2, points: 3, sentPoints: 3 });
});

test('f) sendPastDays: los pendientes de un día viejo pasan a enviados', () => {
  const today = getTodayKey();
  const days = {
    schemaVersion: 3,
    days: {
      '2000-01-01': { ejercicio: { level: 2, points: 3, sentPoints: 0 } },
      [today]: { ejercicio: { level: 1, points: 1, sentPoints: 0 } },
    },
  };

  const next = sendPastDays(days);
  assert.deepEqual(next.days['2000-01-01'].ejercicio, { level: 2, points: 3, sentPoints: 3 });
  assert.deepEqual(next.days[today].ejercicio, { level: 1, points: 1, sentPoints: 0 });
});
