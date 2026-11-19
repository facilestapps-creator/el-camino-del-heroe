// Bloque 3 (V2) — Lógica y datos de los hábitos propios. Sin DOM y sin acceso
// directo a localStorage (eso vive en storage.js). Los puntos son fijos y el
// historial sigue guardándose en days[fecha][habitId], igual que los hábitos
// propuestos: archivar conserva las entradas viejas.

import { getTodayKey, sendHabitDayPoints } from './habits.js';
import { saveCustomHabits } from './storage.js';

export const MAX_SLOTS = 3;
const MAX_LABEL = 30;
const MAX_DESC = 40;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^custom-(\d+)$/;

function cleanText(value, max) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' || trimmed.length > max ? null : trimmed;
}

function hasValidText(value, max) {
  return typeof value === 'string' && value.trim() !== '' && value.trim().length <= max;
}

export function validateFields(fields) {
  const label = cleanText(fields?.label, MAX_LABEL);
  const minDesc = cleanText(fields?.minDesc, MAX_DESC);
  const fullDesc = cleanText(fields?.fullDesc, MAX_DESC);
  if (!label || !minDesc || !fullDesc) {
    return { ok: false, reason: !label ? 'label' : (!minDesc ? 'minDesc' : 'fullDesc') };
  }
  return { ok: true, label, minDesc, fullDesc };
}

// El número nunca se reutiliza (ni aunque el hábito esté archivado) para que
// el historial de un id no pase a otro hábito.
export function nextCustomId(customs) {
  let max = 0;
  for (const habit of customs) {
    const match = typeof habit?.id === 'string' ? ID_RE.exec(habit.id) : null;
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `custom-${max + 1}`;
}

// Archivado hoy ocupa lugar; archivado en día anterior ya no.
export function occupiesSlot(habit, today) {
  return !habit.archived || habit.archivedDate === today;
}

export function occupiedSlots(customs, today) {
  return customs.filter((habit) => occupiesSlot(habit, today)).length;
}

export function activeCustomHabits(customs) {
  return customs.filter((habit) => !habit.archived);
}

export function createCustomHabit(customs, fields, today = getTodayKey()) {
  const checked = validateFields(fields);
  if (!checked.ok) {
    return { ok: false, reason: checked.reason, customs };
  }
  if (occupiedSlots(customs, today) >= MAX_SLOTS) {
    return { ok: false, reason: 'full', customs };
  }
  const habit = {
    id: nextCustomId(customs),
    label: checked.label,
    minDesc: checked.minDesc,
    fullDesc: checked.fullDesc,
    minPoints: 1,
    fullPoints: 3,
    style: 'direct',
    archived: false,
    archivedDate: null,
  };
  const next = [...customs, habit];
  saveCustomHabits(next);
  return { ok: true, habit, customs: next };
}

// Solo se editan nombre y descripciones; puntos, estilo e id quedan fijos.
export function editCustomHabit(customs, id, fields) {
  const index = customs.findIndex((habit) => habit.id === id);
  if (index < 0) {
    return { ok: false, reason: 'missing', customs };
  }
  if (customs[index].archived) {
    return { ok: false, reason: 'archived', customs };
  }
  const checked = validateFields(fields);
  if (!checked.ok) {
    return { ok: false, reason: checked.reason, customs };
  }
  const habit = {
    ...customs[index],
    label: checked.label,
    minDesc: checked.minDesc,
    fullDesc: checked.fullDesc,
  };
  const next = [...customs];
  next[index] = habit;
  saveCustomHabits(next);
  return { ok: true, habit, customs: next };
}

// Al archivar: se envían SOLO los pendientes de este hábito en el día de hoy
// (misma fecha que usa el historial) y se marca archivedDate. Las entradas
// viejas de days[fecha][id] no se tocan, así el historial queda intacto.
export function archiveCustomHabit(customs, daysData, id, today = getTodayKey()) {
  const index = customs.findIndex((habit) => habit.id === id);
  if (index < 0) {
    return { ok: false, reason: 'missing', customs, daysData };
  }
  if (customs[index].archived) {
    return { ok: false, reason: 'archived', customs, daysData };
  }
  const habit = { ...customs[index], archived: true, archivedDate: today };
  const next = [...customs];
  next[index] = habit;
  // Primero se envía SOLO este hábito del día (eso ya guarda days), después se
  // guarda la lista con archivedDate: así un recargue inmediato no deja el
  // hábito activo con sus puntos ya enviados.
  const nextDays = sendHabitDayPoints(daysData, today, id);
  saveCustomHabits(next);
  return { ok: true, habit, customs: next, daysData: nextDays };
}

// Validación usada por el respaldo. Un respaldo sin la clave sigue siendo válido;
// uno que la traiga mal formada se rechaza sin tocar datos.
export function isValidCustomHabitsList(value, today = getTodayKey()) {
  if (!Array.isArray(value)) {
    return false;
  }
  const ids = new Set();
  for (const habit of value) {
    if (typeof habit !== 'object' || habit === null || Array.isArray(habit)) {
      return false;
    }
    if (typeof habit.id !== 'string' || !ID_RE.test(habit.id) || ids.has(habit.id)) {
      return false;
    }
    ids.add(habit.id);
    if (!hasValidText(habit.label, MAX_LABEL)
      || !hasValidText(habit.minDesc, MAX_DESC)
      || !hasValidText(habit.fullDesc, MAX_DESC)) {
      return false;
    }
    if (habit.minPoints !== 1 || habit.fullPoints !== 3 || habit.style !== 'direct') {
      return false;
    }
    if (typeof habit.archived !== 'boolean') {
      return false;
    }
    if (habit.archived) {
      if (typeof habit.archivedDate !== 'string' || !DATE_RE.test(habit.archivedDate)) {
        return false;
      }
    } else if (habit.archivedDate !== null) {
      return false;
    }
  }
  return occupiedSlots(value, today) <= MAX_SLOTS;
}
