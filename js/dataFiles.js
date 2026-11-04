// Capa de datos: lectura de los archivos JSON de data/ (red/archivo).
// Nada de localStorage acá — eso vive en storage.js.

export async function loadJSON(fileName) {
  const response = await fetch(`data/${fileName}.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar data/${fileName}.json (HTTP ${response.status})`);
  }
  return response.json();
}
