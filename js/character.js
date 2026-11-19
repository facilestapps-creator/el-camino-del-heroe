// V2 / Bloque 1 (Pieza 4) — Personaje: catálogo, estado y reglas. Sin DOM, sin
// fetch y sin importar storage.js: todo lo que acá se devuelve es un estado
// nuevo, nunca se muta el estado de entrada. Quien orquesta (piezas 5/6) guarda
// con saveCharacterState() después de cada cambio.

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Validación SOLO de forma, usada por el respaldo y por loadCharacterState():
// un id que ya no esté en el catálogo es válido (los ejemplos se reemplazarán
// por piezas reales y los estados viejos no deben romper la carga).
export function isValidCharacterState(value) {
  if (!isPlainObject(value) || !isPlainObject(value.equipped)) {
    return false;
  }
  for (const id of Object.values(value.equipped)) {
    if (id !== null && typeof id !== 'string') {
      return false;
    }
  }
  if (value.offer === null) {
    return true;
  }
  if (!isPlainObject(value.offer) || typeof value.offer.cityId !== 'string'
    || !Array.isArray(value.offer.itemIds)) {
    return false;
  }
  return value.offer.itemIds.every((id) => typeof id === 'string');
}

// Piezas del catálogo con id único y casillero existente. Las entradas
// desconocidas se ignoran: no pueden romper la bolsa ni la oferta.
function catalogItems(catalog) {
  const slotIds = new Set(
    (catalog?.slots ?? [])
      .filter((slot) => isPlainObject(slot) && typeof slot.id === 'string')
      .map((slot) => slot.id),
  );
  const seen = new Set();
  return (catalog?.items ?? []).filter((item) => {
    if (!isPlainObject(item) || typeof item.id !== 'string'
      || typeof item.slot !== 'string' || !slotIds.has(item.slot) || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function stringSet(values) {
  return new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string'));
}

// Bolsa general: piezas conocidas que no están puestas ni en la oferta actual.
export function getBag(state, catalog) {
  const equipped = stringSet(Object.values(state?.equipped ?? {}));
  const offered = stringSet(state?.offer?.itemIds);
  return catalogItems(catalog).filter(
    (item) => !equipped.has(item.id) && !offered.has(item.id),
  );
}

// Nueva oferta para una ciudad. La bolsa se calcula como si no hubiera oferta
// (se reemplaza por completo), así las piezas de la oferta anterior pueden
// volver a salir. El tamaño y los índices salen de rng (default Math.random).
export function generateOffer(state, catalog, cityId, rng = Math.random) {
  const bag = getBag({ ...state, offer: null }, catalog);
  const pick = (size) => Math.min(size - 1, Math.max(0, Math.floor(rng() * size)));
  const count = bag.length === 0 ? 0 : 1 + pick(Math.min(3, bag.length));

  // Muestreo sin repetir (Fisher-Yates sobre la bolsa, solo lo que se usa).
  const pool = [...bag];
  for (let i = 0; i < pool.length - 1; i += 1) {
    const j = i + pick(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    state: {
      ...state,
      offer: { cityId, itemIds: pool.slice(0, count).map((item) => item.id) },
    },
  };
}

// Poner una pieza de la oferta: la anterior del mismo casillero queda fuera de
// equipped (vuelve a la bolsa de forma implícita) y la elegida sale de la oferta.
export function equipItem(state, catalog, itemId) {
  const offer = state?.offer;
  const offered = Array.isArray(offer?.itemIds) ? offer.itemIds : [];
  if (typeof itemId !== 'string' || !offered.includes(itemId)) {
    return { ok: false, reason: 'notInOffer', state };
  }
  const item = catalogItems(catalog).find((entry) => entry.id === itemId);
  if (!item) {
    return { ok: false, reason: 'unknown', state };
  }
  return {
    ok: true,
    item,
    state: {
      ...state,
      equipped: { ...(state?.equipped ?? {}), [item.slot]: itemId },
      offer: { ...offer, itemIds: offered.filter((id) => id !== itemId) },
    },
  };
}

// Al cambiar de ciudad se descarta la oferta: lo no elegido vuelve a la bolsa.
export function clearOffer(state) {
  return { ...state, offer: null };
}
