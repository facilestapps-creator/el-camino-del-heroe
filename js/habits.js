import { SCHEMA_VERSION } from './config.js';
import { loadJSON } from './dataFiles.js';
import { saveDays } from './storage.js';

// Lógica de hábitos y cálculo de puntos (esquema v3: { level, points, sentPoints, steps }).

// Devuelve habits.json completo: { stepsPerPoint, habits }.
export async function getHabitsData() {
  return loadJSON('habits');
}

export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLevels(daysData) {
  const days = daysData?.days ?? {};
  const key = getTodayKey();
  const today = days[key];
  return today ?? {};
}

// Acepta formato viejo (numero) y formato nuevo ({ level, points }).
export function getLevelValue(entry) {
  if (typeof entry === 'object' && entry !== null) {
    return entry.level ?? 0;
  }
  return typeof entry === 'number' ? entry : 0;
}

// Guarda el nivel del dia con los puntos calculados al momento de guardar
// usando habits.json de ese momento (esquema v3: { level, points, sentPoints }).
// NO muta daysData: devuelve el objeto nuevo para que quien llama lo reasigne.
// Si el envio del dia ya esta hecho (sentPoints > 0) el nivel queda BLOQUEADO
// y no se guarda nada.
export function saveTodayLevel(daysData, habitId, level, habit) {
  const days = { ...(daysData?.days ?? {}) };
  const key = getTodayKey();
  const prev = days[key]?.[habitId];
  if (prev && typeof prev === 'object' && (prev.sentPoints ?? 0) > 0) {
    return daysData;
  }
  const points = computePoints(level, habit);
  days[key] = { ...(days[key] ?? {}), [habitId]: { level, points, sentPoints: 0 } };
  const next = { ...daysData, schemaVersion: SCHEMA_VERSION, days };
  saveDays(next);
  return next;
}

// Valida los pasos ingresados: el mínimo es lo ya ENVIADO
// (sentPoints × stepsPerPoint — lo enviado no se puede bajar) y el tope es
// maxSteps. Campo vacío o no numérico = 0 y aplica la misma regla.
// Devuelve { ok, reason, min, max } (reason: 'min' | 'max' cuando !ok).
export function validateSteps(entry, steps, stepsPerPoint, maxSteps) {
  const sent = entry && typeof entry === 'object' && typeof entry.sentPoints === 'number'
    ? entry.sentPoints
    : 0;
  const min = sent * stepsPerPoint;
  const numeric = Number(steps);
  const safeSteps = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  if (safeSteps < min) {
    return { ok: false, reason: 'min', min, max: maxSteps };
  }
  if (safeSteps > maxSteps) {
    return { ok: false, reason: 'max', min, max: maxSteps };
  }
  return { ok: true, reason: null, min, max: maxSteps };
}

// Guarda los pasos del dia (ingreso manual, total acumulado del dia).
// points = floor(steps / stepsPerPoint); nunca baja de lo ya enviado
// (sentPoints). Si validateSteps rechaza el valor NO se guarda nada y se
// devuelve daysData sin cambios (la logica se defiende sola, no solo la
// pantalla). Devuelve el daysData nuevo cuando es valido.
export function saveSteps(daysData, habitId, steps, stepsPerPoint, maxSteps) {
  const days = { ...(daysData?.days ?? {}) };
  const key = getTodayKey();
  const prev = days[key]?.[habitId];
  const numeric = Number(steps);
  const safeSteps = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  const validation = validateSteps(prev, safeSteps, stepsPerPoint, maxSteps);
  if (!validation.ok) {
    return daysData;
  }
  const sent = prev && typeof prev === 'object' && typeof prev.sentPoints === 'number'
    ? prev.sentPoints
    : 0;
  const points = Math.max(sent, Math.floor(safeSteps / stepsPerPoint));
  days[key] = { ...(days[key] ?? {}), [habitId]: { steps: safeSteps, points, sentPoints: sent } };
  const next = { ...daysData, schemaVersion: SCHEMA_VERSION, days };
  saveDays(next);
  return next;
}

export function computePoints(level, habit) {
  if (level === 0) {
    return 0;
  }
  return level === 1 ? habit.minPoints : habit.fullPoints;
}

// Total del dia usando los puntos guardados (si existen) o recien calculados.
// Tambien devuelve enviados y pendientes del dia (para Enviar y Puntos de hoy).
export function computeDayPoints(levelsByHabit, habits) {
  const pointsByHabit = {};
  let total = 0;
  let sent = 0;

  for (const habit of habits) {
    const entry = levelsByHabit?.[habit.id];
    let habitPoints;
    if (typeof entry === 'object' && entry !== null && typeof entry.points === 'number') {
      habitPoints = entry.points;
    } else {
      habitPoints = computePoints(getLevelValue(entry), habit);
    }
    pointsByHabit[habit.id] = habitPoints;
    total += habitPoints;
    if (typeof entry === 'object' && entry !== null && typeof entry.sentPoints === 'number') {
      sent += entry.sentPoints;
    }
  }

  const pending = Math.max(0, total - sent);
  return { pointsByHabit, total, sent, pending };
}

// Saldo: solo los puntos YA ENVIADOS de todos los dias cuentan como
// disponibles. Los pendientes no suman ni fluyen al viaje.
export function computeTotalSent(daysData) {
  let total = 0;
  const days = daysData?.days ?? {};
  for (const day of Object.values(days)) {
    for (const entry of Object.values(day)) {
      if (typeof entry === 'object' && entry !== null) {
        total += typeof entry.sentPoints === 'number' ? entry.sentPoints : (entry.points ?? 0);
      }
    }
  }
  return total;
}

// Enviar pendientes: marca todos los puntos del dia como enviados.
// Devuelve el daysData nuevo (o el mismo si no habia nada que enviar).
export function sendTodayPoints(daysData) {
  const key = getTodayKey();
  return sendDay(daysData, key);
}

// Cambio de dia: los pendientes de DIAS ANTERIORES se envian solos.
export function sendPastDays(daysData) {
  const today = getTodayKey();
  let next = daysData;
  for (const dayKey of Object.keys(daysData?.days ?? {})) {
    if (dayKey < today) {
      next = sendDay(next, dayKey);
    }
  }
  return next;
}

function sendDay(daysData, dayKey) {
  const day = daysData?.days?.[dayKey];
  if (!day) {
    return daysData;
  }
  const nextDay = {};
  let changed = false;
  for (const [habitId, entry] of Object.entries(day)) {
    if (typeof entry === 'object' && entry !== null && typeof entry.points === 'number') {
      if ((entry.sentPoints ?? 0) !== entry.points) {
        changed = true;
      }
      nextDay[habitId] = { ...entry, sentPoints: entry.points };
    } else {
      nextDay[habitId] = entry;
    }
  }
  if (!changed) {
    return daysData;
  }
  const next = {
    ...daysData,
    schemaVersion: SCHEMA_VERSION,
    days: { ...daysData.days, [dayKey]: nextDay },
  };
  saveDays(next);
  return next;
}

// Migracion a esquema v3: toda entrada existente pasa a sentPoints = points
// (el saldo NO cambia). Entradas viejas:
//   v1 (numero)          -> { level, points calculados, sentPoints = points }
//   v2 ({level, points}) -> { ...el mismo, sentPoints = points }
//   pasos con level 1/2  -> { steps: 2500|5000, points: <guardados>,
//                             sentPoints: <guardados> } (NO se recalculan)
export function migrateDaysData(daysData, habits) {
  if ((daysData?.schemaVersion ?? 1) >= SCHEMA_VERSION) {
    return daysData;
  }

  const days = {};
  for (const [dayKey, day] of Object.entries(daysData?.days ?? {})) {
    const migratedDay = {};
    for (const [habitId, value] of Object.entries(day)) {
      const habit = habits.find((h) => h.id === habitId);
      migratedDay[habitId] = migrateEntry(habit, value);
    }
    days[dayKey] = migratedDay;
  }

  const migrated = { schemaVersion: SCHEMA_VERSION, days };
  saveDays(migrated);
  return migrated;
}

function stepsForLevel(level) {
  return level === 1 ? 2500 : level === 2 ? 5000 : 0;
}

function migrateEntry(habit, value) {
  if (typeof value === 'object' && value !== null && typeof value.sentPoints === 'number') {
    return value; // ya es v3
  }

  const isSteps = habit?.style === 'number';
  const level = typeof value === 'number'
    ? value
    : (typeof value?.level === 'number' ? value.level : 0);
  // v2 trae points guardado; v1 no, se calcula (min/full con fallback 1/3).
  const points = typeof value === 'object' && value !== null && typeof value.points === 'number'
    ? value.points
    : level === 1
      ? (habit?.minPoints ?? 1)
      : level === 2
        ? (habit?.fullPoints ?? 3)
        : 0;

  if (isSteps) {
    return { steps: stepsForLevel(level), points, sentPoints: points };
  }
  return { level, points, sentPoints: points };
}
