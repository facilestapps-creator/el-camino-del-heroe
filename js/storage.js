import { DATA_KEY, SCHEMA_VERSION } from './config.js';

export async function loadJSON(fileName) {
  const response = await fetch(`data/${fileName}.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar data/${fileName}.json (HTTP ${response.status})`);
  }
  return response.json();
}

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
