import { WORLD_KEY, WORLD_SCHEMA_VERSION } from './config.js';
import { loadJSON } from './dataFiles.js';
import { loadFromStorage, saveToStorage } from './storage.js';

// Fase 2 — Modelo del mundo: estado del viajero, costos y caminos.

export async function getWorld() {
  return loadJSON('world');
}

export function loadWorldState(world) {
  const saved = loadFromStorage(WORLD_KEY, null);
  if (saved === null || typeof saved !== 'object') {
    return freshState(world);
  }
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    spent: typeof saved.spent === 'number' ? saved.spent : 0,
    currentCity: typeof saved.currentCity === 'string' ? saved.currentCity : world.startCity,
    visited: Array.isArray(saved.visited) ? saved.visited : [world.startCity],
    explored: Array.isArray(saved.explored) ? saved.explored : [],
    trip: saved.trip && typeof saved.trip === 'object' ? saved.trip : null,
    dragonRolls: saved.dragonRolls && typeof saved.dragonRolls === 'object'
      && !Array.isArray(saved.dragonRolls) ? saved.dragonRolls : {},
  };
}

function freshState(world) {
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    spent: 0,
    currentCity: world.startCity,
    visited: [world.startCity],
    explored: [],
    trip: null,
    dragonRolls: {},
  };
}

export function saveWorldState(state) {
  saveToStorage(WORLD_KEY, state);
}

function edgesOf(world, cityId) {
  return world.routes.filter((r) => r.from === cityId || r.to === cityId);
}

// Camino más corto (Opción B) entre dos ciudades, por costos BASE.
// Devuelve { path, edges, baseCost } o null si no hay camino.
export function shortestPath(world, from, to) {
  if (from === to) {
    return { path: [from], edges: [], baseCost: 0 };
  }
  const dist = {};
  const prev = {};
  const prevEdge = {};
  const pending = new Set(world.cities.map((c) => c.id));
  for (const id of pending) {
    dist[id] = Infinity;
  }
  dist[from] = 0;

  while (pending.size > 0) {
    let current = null;
    let best = Infinity;
    for (const id of pending) {
      if (dist[id] < best) {
        best = dist[id];
        current = id;
      }
    }
    if (current === null || current === to) {
      break;
    }
    pending.delete(current);
    for (const edge of edgesOf(world, current)) {
      const other = edge.from === current ? edge.to : edge.from;
      if (!pending.has(other)) {
        continue;
      }
      const alt = dist[current] + edge.points;
      if (alt < dist[other]) {
        dist[other] = alt;
        prev[other] = current;
        prevEdge[other] = edge;
      }
    }
  }

  if (dist[to] === Infinity || dist[to] === undefined) {
    return null;
  }
  const path = [to];
  const edges = [];
  let node = to;
  while (node !== from) {
    if (prevEdge[node] === undefined) {
      return null;
    }
    edges.unshift(prevEdge[node]);
    node = prev[node];
    path.unshift(node);
  }
  return { path, edges, baseCost: dist[to] };
}

// Costo final de un camino: base × travelCostMultiplier.
// Si el camino incluye un tramo con dragones, ese tramo se duplica (cost ya multiplicado).
export function pathCost(world, edges, withDragon) {
  let cost = 0;
  for (const edge of edges) {
    cost += edge.points * world.travelCostMultiplier;
    if (withDragon && edge.dragonRisk) {
      cost += edge.points * world.travelCostMultiplier;
    }
  }
  return cost;
}

export function dragonEdgeOf(edges) {
  return edges.find((edge) => edge.dragonRisk) ?? null;
}

// Tirada de dragones: si ya hay resultado para ese tramo se reutiliza (sin
// re-tirar). El resultado se guarda EN EL MOMENTO DE TIRAR — quien llama
// persiste el estado apenas se llama esta función (antes de la animación),
// así recargar o cerrar durante la moneda no permite volver a tirar.
export function rollDragon(state, world, edgeId) {
  const cached = state.dragonRolls[edgeId];
  if (typeof cached === 'boolean') {
    return { isDragon: cached, cached: true };
  }
  const isDragon = Math.random() < world.dragonProbability;
  state.dragonRolls[edgeId] = isDragon;
  return { isDragon, cached: false };
}

// Destinos posibles desde una ciudad. Con DOS caminos directos entre el
// mismo par (flujo "dos caminos"): una fila por ruta directa, de más
// barata a más cara (el viajero elige cuál tomar). Con una sola directa o
// ninguna: camino más corto multi-etapa como siempre.
export function destinationsFrom(world, fromCityId) {
  const rows = [];
  for (const city of world.cities) {
    if (city.id === fromCityId) {
      continue;
    }
    const direct = world.routes.filter(
      (r) => (r.from === fromCityId && r.to === city.id)
        || (r.to === fromCityId && r.from === city.id),
    );
    if (direct.length > 1) {
      const ordered = direct.slice().sort((a, b) => a.points - b.points);
      for (const route of ordered) {
        rows.push(buildDest(world, city, {
          path: [fromCityId, city.id],
          edges: [route],
          baseCost: route.points,
        }));
      }
      continue;
    }
    const path = shortestPath(world, fromCityId, city.id);
    if (path !== null) {
      rows.push(buildDest(world, city, path));
    }
  }
  return rows;
}

function buildDest(world, city, path) {
  const dragonEdge = dragonEdgeOf(path.edges);
  return {
    city,
    path,
    // Tramo directo elegido (null si el camino es multi-etapa): identifica
    // la ruta en el viaje para que el marcador la siga.
    route: path.edges.length === 1 ? path.edges[0] : null,
    dragonEdge,
    cost: pathCost(world, path.edges, false),
    costWithDragon: dragonEdge ? pathCost(world, path.edges, true) : null,
  };
}

// Viaje progresivo: mientras haya viaje activo, TODO el saldo disponible
// fluye solo hacia el viaje (modelo Zombie Hikers, decisión 2026-10-30).
export function flowBalanceToTrip(state, balance) {
  const trip = state.trip;
  if (!trip) {
    return 0;
  }
  const remaining = trip.cost - trip.progress;
  if (remaining <= 0) {
    return 0;
  }
  const flow = Math.min(balance, remaining);
  if (flow <= 0) {
    return 0;
  }
  trip.progress += flow;
  state.spent += flow;
  return flow;
}

export function tripArrived(trip) {
  return trip !== null && trip.progress >= trip.cost;
}

// Viaje a un destino. Con dos caminos entre el mismo par, `route` guarda la
// ruta elegida (id) para que el marcador la siga; viajes multi-etapa o
// viejos (sin route) usan el camino más corto (retrocompatible).
export function startTrip(state, dest, cost, dragon, withExplore, route) {
  // withExplore: plan "Viajar, entrar y explorar" — el costo ya incluye la
  // exploracion; al llegar la ciudad queda registrada y explorada sola.
  state.trip = {
    dest,
    cost,
    progress: 0,
    dragon: Boolean(dragon),
    withExplore: Boolean(withExplore),
    route: route && typeof route.id === 'string' ? route.id : null,
  };
}

// Llegada (viaje completado): pasas a estar en la ciudad destino, aun SIN
// registrar la visita (eso es "Entrar"). Devuelve true si cambio algo.
// Si el viaje era "entrar y explorar", ademas queda registrada y explorada
// (el costo de explorar ya viaja pagado dentro del viaje).
export function settleArrival(state) {
  const trip = state.trip;
  if (!trip || trip.progress < trip.cost) {
    return false;
  }
  let changed = false;
  if (state.currentCity !== trip.dest) {
    state.currentCity = trip.dest;
    changed = true;
  }
  if (trip.withExplore) {
    if (!state.visited.includes(trip.dest)) {
      state.visited.push(trip.dest);
      changed = true;
    }
    if (!state.explored.includes(trip.dest)) {
      state.explored.push(trip.dest);
      changed = true;
    }
    state.trip = null;
    state.dragonRolls = {};
    changed = true;
  }
  return changed;
}

// Posicion del marcador en el mapa. Sin viaje: la ciudad actual. Con viaje:
// se mueve PROPORTIONAL del camino (por el costo pagado de cada tramo)
// desde el origen hasta el destino (decision 2026-10-30).
export function markerPosition(world, state) {
  const current = world.cities.find((c) => c.id === state.currentCity);
  const trip = state.trip;
  if (!trip) {
    return current ? { x: current.x, y: current.y } : null;
  }
  const ratio = trip.cost > 0 ? Math.min(1, trip.progress / trip.cost) : 1;
  const dest = world.cities.find((c) => c.id === trip.dest);
  if (!dest) {
    return current ? { x: current.x, y: current.y } : null;
  }
  if (ratio >= 1) {
    return { x: dest.x, y: dest.y };
  }
  // El origen es la ciudad actual: solo cambia al llegar (settleArrival).
  const from = current;
  if (!from || from.id === dest.id) {
    return { x: dest.x, y: dest.y };
  }
  // Ruta elegida al viajar (dos caminos entre el mismo par): se respeta;
  // viajes sin ruta guardada (multi-etapa o antiguos) → camino más corto.
  let path = null;
  if (trip.route) {
    const route = world.routes.find((r) => r.id === trip.route);
    const connects = route
      && ((route.from === from.id && route.to === dest.id)
        || (route.to === from.id && route.from === dest.id));
    if (connects) {
      path = { path: [from.id, dest.id], edges: [route], baseCost: route.points };
    }
  }
  if (!path) {
    path = shortestPath(world, from.id, dest.id);
  }
  if (!path || path.edges.length === 0) {
    return { x: dest.x, y: dest.y };
  }
  // Peso final de cada tramo (igual que pathCost, con dragon si el viaje lo tiene).
  const weights = path.edges.map((edge) => edge.points * world.travelCostMultiplier
    * (trip.dragon && edge.dragonRisk ? 2 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return { x: dest.x, y: dest.y };
  }
  let remaining = ratio * total;
  let x = from.x;
  let y = from.y;
  for (let i = 0; i < path.edges.length; i += 1) {
    const next = world.cities.find((c) => c.id === path.path[i + 1]);
    if (!next) {
      break;
    }
    const weight = weights[i];
    if (remaining >= weight) {
      remaining -= weight;
      x = next.x;
      y = next.y;
      continue;
    }
    const t = weight > 0 ? remaining / weight : 1;
    // El tramo se recorre por su polilínea (waypoints del dibujo, si tiene).
    const waypoints = edgeWaypointsOrdered(path.edges[i], path.path[i]);
    return pointAlongRoute({ x, y }, waypoints, { x: next.x, y: next.y }, t);
  }
  return { x: dest.x, y: dest.y };
}

// Waypoints de un tramo en el sentido del viaje: si la ruta está declarada
// al revés (to→from), el orden se invierte.
function edgeWaypointsOrdered(edge, fromId) {
  const raw = Array.isArray(edge?.waypoints) ? edge.waypoints : [];
  const clean = raw.filter(
    (p) => p && typeof p.x === 'number' && typeof p.y === 'number',
  );
  return edge.from === fromId ? clean : clean.slice().reverse();
}

// Punto a la fracción t (0..1) de la polilínea start → waypoints → end,
// repartiendo por longitud de segmento. Sin waypoints = recta (como antes).
function pointAlongRoute(start, waypoints, end, t) {
  const line = [start, ...waypoints, end];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < line.length - 1; i += 1) {
    const segment = routeSegmentLength(line[i], line[i + 1]);
    lengths.push(segment);
    total += segment;
  }
  if (total <= 0) {
    return { x: end.x, y: end.y };
  }
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remaining >= lengths[i]) {
      remaining -= lengths[i];
      continue;
    }
    const segment = lengths[i];
    const step = segment > 0 ? remaining / segment : 1;
    return {
      x: line[i].x + (line[i + 1].x - line[i].x) * step,
      y: line[i].y + (line[i + 1].y - line[i].y) * step,
    };
  }
  return { x: end.x, y: end.y };
}

// Longitud de un segmento en % de imagen. La imagen no es cuadrada
// (963×1121): la x se pondera por el aspecto para que las longitudes
// en % correspondan a píxeles reales y la velocidad sea pareja.
function routeSegmentLength(a, b) {
  const dx = (a.x - b.x) * 0.859;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Cancelar devuelve al saldo los puntos ya invertidos en el viaje.
export function cancelTrip(state) {
  if (!state.trip) {
    return;
  }
  state.spent = Math.max(0, state.spent - state.trip.progress);
  state.trip = null;
}

// Entrar: registra la ciudad como visitada (gratis) y HABILITA Explorar.
// Requiere viaje llegado. Limpia dragonRolls (M2).
export function enterCity(state) {
  if (!tripArrived(state.trip)) {
    return false;
  }
  const dest = state.trip.dest;
  state.currentCity = dest;
  if (!state.visited.includes(dest)) {
    state.visited.push(dest);
  }
  state.trip = null;
  state.dragonRolls = {};
  return true;
}

export function exploreCost(world) {
  return world.explorationCost * world.travelCostMultiplier;
}

export function hasExplored(state, cityId) {
  return state.explored.includes(cityId);
}

// Explorar: solo en una ciudad ENTRADA (visited) y aun no explorada.
// Cuesta explorationCost × multiplier y marca la ciudad.
export function exploreCity(world, state, balance) {
  const cost = exploreCost(world);
  if (!state.visited.includes(state.currentCity)
    || hasExplored(state, state.currentCity)
    || balance < cost) {
    return false;
  }
  state.spent += cost;
  state.explored.push(state.currentCity);
  return true;
}
