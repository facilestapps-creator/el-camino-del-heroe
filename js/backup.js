import { SCHEMA_VERSION, BACKUP_FILE_PREFIX, META_KEY, DATA_KEY, WORLD_KEY } from './config.js';
import { getTodayKey } from './habits.js';

// Bloque B — Respaldo: exportar (mini-bloque 2).
// M6: meta:v1 ({ lastBackupAt }) se guarda ANTES de armar el archivo, así
// queda incluido dentro del propio respaldo.

export function loadMeta() {
  const raw = localStorage.getItem(META_KEY);
  if (raw === null) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastBackupAt() {
  const meta = loadMeta();
  meta.lastBackupAt = new Date().toISOString();
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  return meta;
}

// Días completos desde el último respaldo; null = nunca (o fecha inválida).
export function daysSinceBackup(meta) {
  const raw = meta?.lastBackupAt;
  if (typeof raw !== 'string' || raw === '') {
    return null;
  }
  const time = Date.parse(raw);
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

// Recoge TODAS las claves de localStorage que empiezan con "habitQuest:",
// así el mundo y lo que se agregue en el futuro queda incluido sin tocar este código.
export function collectBackupData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key === null || !key.startsWith('habitQuest:')) {
      continue;
    }
    const raw = localStorage.getItem(key);
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return data;
}

export function createBackup() {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    data: collectBackupData(),
  };
}

export function exportBackup() {
  // M6: la fecha se registra ANTES de armar el archivo (queda dentro).
  saveLastBackupAt();
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${BACKUP_FILE_PREFIX}-${getTodayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Mini-bloque 3: lectura y validación del archivo elegido.

export function parseBackupText(text) {
  try {
    return { ok: true, backup: JSON.parse(text) };
  } catch {
    return { ok: false, backup: null };
  }
}

// Respaldo válido = JSON con fecha de exportación, versión del esquema y
// datos con al menos una clave "habitQuest:".
// M6: además, SI el archivo trae data:v1 / world:v1, deben cumplir su
// esquema (days con entradas de los esquemas 1/2/3; world con spent,
// currentCity, visited y explored). Si no → inválido, sin tocar datos.
export function isValidBackup(backup) {
  if (typeof backup !== 'object' || backup === null || Array.isArray(backup)) {
    return false;
  }
  if (typeof backup.exportedAt !== 'string' || backup.exportedAt === '') {
    return false;
  }
  if (typeof backup.schemaVersion !== 'number') {
    return false;
  }
  if (typeof backup.data !== 'object' || backup.data === null || Array.isArray(backup.data)) {
    return false;
  }
  if (!Object.keys(backup.data).some((key) => key.startsWith('habitQuest:'))) {
    return false;
  }
  return isValidDataEntry(backup.data[DATA_KEY]) && isValidWorldEntry(backup.data[WORLD_KEY]);
}

// data:v1 = { days: { <fecha>: { <hábito>: { level?, points?, sentPoints?, steps? } } } }
// (esquemas 1, 2 y 3; todos los campos presentes deben ser números).
function isValidDataEntry(entry) {
  if (entry === undefined) {
    return true; // el archivo no incluye esta clave
  }
  const data = parseIfNeeded(entry);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const days = data.days;
  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    return false;
  }
  for (const day of Object.values(days)) {
    if (typeof day !== 'object' || day === null || Array.isArray(day)) {
      return false;
    }
    for (const habitEntry of Object.values(day)) {
      if (typeof habitEntry !== 'object' || habitEntry === null || Array.isArray(habitEntry)) {
        return false;
      }
      for (const [field, value] of Object.entries(habitEntry)) {
        const numeric = ['level', 'points', 'sentPoints', 'steps'];
        if (numeric.includes(field) && typeof value !== 'number') {
          return false;
        }
      }
    }
  }
  return true;
}

// world:v1 = { spent: number, currentCity: string, visited: [], explored: [] }.
function isValidWorldEntry(entry) {
  if (entry === undefined) {
    return true; // el archivo no incluye esta clave
  }
  const world = parseIfNeeded(entry);
  if (typeof world !== 'object' || world === null || Array.isArray(world)) {
    return false;
  }
  if (typeof world.spent !== 'number') {
    return false;
  }
  if (typeof world.currentCity !== 'string' || world.currentCity === '') {
    return false;
  }
  return Array.isArray(world.visited) && Array.isArray(world.explored);
}

// Algunos respaldos viejos guardan los valores como strings JSON.
function parseIfNeeded(value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Mini-bloque 4: aplicar el respaldo — borra TODAS las claves habitQuest:
// actuales y escribe las del archivo. La recarga la dispara quien lo llama.
export function applyBackup(backup) {
  const currentKeys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key !== null && key.startsWith('habitQuest:')) {
      currentKeys.push(key);
    }
  }
  for (const key of currentKeys) {
    localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(backup.data)) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}
