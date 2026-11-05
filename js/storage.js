import { DATA_KEY, SCHEMA_VERSION } from './config.js';

// Capa de persistencia: ÚNICO módulo que toca `localStorage`.

export function loadDays() {
  const raw = localStorage.getItem(DATA_KEY);
  if (raw === null) {
    return { schemaVersion: SCHEMA_VERSION, days: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: parsed.schemaVersion ?? 1,
      days: parsed.days ?? {},
    };
  } catch (error) {
    console.warn('No se pudo leer de localStorage:', DATA_KEY, error);
    return { schemaVersion: 1, days: {} };
  }
}

export function saveDays(days) {
  localStorage.setItem(DATA_KEY, JSON.stringify(days));
}

export function loadFromStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallbackValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('No se pudo leer de localStorage:', key, error);
    return fallbackValue;
  }
}

export function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Claves con el prefijo dado, parseadas (lo que no sea JSON válido queda como
// string crudo — respaldos viejos guardaban valores ya serializados).
export function collectByPrefix(prefix) {
  const result = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key === null || !key.startsWith(prefix)) {
      continue;
    }
    const raw = localStorage.getItem(key);
    try {
      result[key] = JSON.parse(raw);
    } catch {
      result[key] = raw;
    }
  }
  return result;
}

// Reemplaza TODAS las claves del prefijo por las del archivo (solo las claves
// del archivo con ese prefijo: otras apps comparten el mismo localStorage y un
// respaldo no puede tocarlas ni fallar por ellas); string = valor crudo ya
// serializado; el resto se serializa.
export function replaceByPrefix(prefix, data) {
  const current = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key !== null && key.startsWith(prefix)) {
      current.push(key);
    }
  }
  for (const key of current) {
    localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}
