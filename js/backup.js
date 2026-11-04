import { SCHEMA_VERSION, BACKUP_FILE_PREFIX, META_KEY, STORAGE_PREFIX, DATA_KEY, WORLD_KEY } from './config.js';
import { getTodayKey } from './habits.js';
import { loadFromStorage, saveToStorage, collectByPrefix, replaceByPrefix } from './storage.js';

// Bloque B — Respaldo: exportar (mini-bloque 2).
// M6: meta:v1 ({ lastBackupAt }) se guarda ANTES de armar el archivo, así
// queda incluido dentro del propio respaldo. 5a: todo el acceso crudo a
// localStorage vive en storage.js — acá solo se usa la capa.

export function loadMeta() {
  const parsed = loadFromStorage(META_KEY, {});
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
}

function saveLastBackupAt() {
  const meta = loadMeta();
  meta.lastBackupAt = new Date().toISOString();
  saveToStorage(META_KEY, meta);
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
  return collectByPrefix(STORAGE_PREFIX);
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
  if (!Object.keys(backup.data).some((key) => key.startsWith(STORAGE_PREFIX))) {
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
  replaceByPrefix(STORAGE_PREFIX, backup.data);
}
