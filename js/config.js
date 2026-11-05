export const DATA_KEY = 'habitQuest:data:v1';
export const WORLD_KEY = 'habitQuest:world:v1';
// Metadatos del respaldo (fecha del último export): vive en el storage y se
// exporta junto con los datos para saber qué tan viejo está el respaldo.
export const META_KEY = 'habitQuest:meta:v1';
export const BACKUP_FILE_PREFIX = 'habit-quest-backup';
// Umbral (días) a partir del cual "Último respaldo" se resalta como viejo.
export const BACKUP_STALE_DAYS = 7;

export const SCHEMA_VERSION = 3;
export const WORLD_SCHEMA_VERSION = 1;
// Prefijo de TODAS las claves del storage del juego, definido una sola vez:
// es lo que usa el respaldo para leer/escribir solo las claves del juego.
export const STORAGE_PREFIX = 'habitQuest:';
