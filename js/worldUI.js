// Fase 2 — Render de la vista del mundo (mapa, ubicación, panel de viaje).
import { destinationsFrom, exploreCost, hasExplored, markerPosition, tripArrived } from './world.js';
import { textOf, fillText } from './text.js';

// Modal de dragones: MUESTRA el resultado de la moneda (la tirada vive en
// world.js — rollDragon). Si es recién tirada: animación. Si viene guardada
// (roll.cached): mismo cartel con el resultado, sin animación.
export function showDragonCoin(world, roll, onResolved) {
  const overlay = document.getElementById('dragon-overlay');
  const title = document.getElementById('dragon-title');
  const coin = document.getElementById('coin');
  const result = document.getElementById('dragon-result');
  const accept = document.getElementById('dragon-accept');
  const texts = world.texts ?? {};
  const isDragon = roll.isDragon;

  title.textContent = textOf(texts, 'dragonTitle');
  result.textContent = '';
  result.className = 'dragon-result';
  accept.textContent = textOf(texts, 'dragonAccept');
  coin.className = 'coin';
  coin.hidden = false;
  overlay.hidden = false;

  const finish = () => {
    result.textContent = textOf(texts, isDragon ? 'dragonResultDragon' : 'dragonResultClear');
    result.classList.add(isDragon ? 'is-dragon' : 'is-clear');
    coin.classList.remove('flipping');
    // Moneda quieta mostrando el lado que tocó (dragón / despejado).
    coin.classList.add('landed');
    if (!isDragon) {
      coin.classList.add('show-clear');
    }
    accept.onclick = () => {
      overlay.hidden = true;
      onResolved(isDragon);
    };
  };

  if (roll.cached) {
    finish();
    return;
  }

  // Forzar reflow para reiniciar la animación y luego tirar la moneda.
  void coin.offsetWidth;
  coin.classList.add('flipping');
  if (isDragon) {
    coin.classList.add('show-dragon');
  }
  setTimeout(finish, 1400);
}

export function renderViewToggle(hoyLabel, worldLabel) {
  const hoyButton = document.getElementById('view-hoy-btn');
  const worldButton = document.getElementById('view-world-btn');
  if (hoyButton) {
    hoyButton.textContent = hoyLabel;
  }
  if (worldButton) {
    worldButton.textContent = worldLabel;
  }
}

export function showView(view) {
  const hoy = document.getElementById('view-hoy');
  const world = document.getElementById('view-world');
  const hoyButton = document.getElementById('view-hoy-btn');
  const worldButton = document.getElementById('view-world-btn');
  if (hoy) {
    hoy.hidden = view !== 'hoy';
  }
  if (world) {
    world.hidden = view !== 'world';
  }
  if (hoyButton) {
    hoyButton.classList.toggle('active', view === 'hoy');
  }
  if (worldButton) {
    worldButton.classList.toggle('active', view === 'world');
  }
}

export function renderWorldMap(world, state, worldTexts) {
  const image = document.getElementById('world-map-img');
  const marker = document.getElementById('map-marker');
  const location = document.getElementById('world-location');
  const city = world.cities.find((c) => c.id === state.currentCity);
  if (image) {
    image.src = world.image;
    image.alt = worldTexts.worldTitle ?? '';
  }
  if (marker) {
    // M4: con viaje activo el marcador avanza proporcional del camino;
    // sin viaje, en la ciudad actual.
    const pos = markerPosition(world, state);
    if (pos) {
      marker.style.left = `${pos.x}%`;
      marker.style.top = `${pos.y}%`;
      marker.hidden = false;
    }
  }
  if (location && city) {
    location.textContent = fillText(textOf(worldTexts, 'locationText'), {
      label: worldTexts.locationLabel,
      city: city.name,
    });
  }
}

// 5d: balanceText = plantilla "{label}: {balance}" (mismo texto que en Hoy).
export function renderWorldBalance(balance, balanceText, label) {
  const element = document.getElementById('world-balance');
  if (element) {
    element.textContent = fillText(balanceText, { label, balance });
  }
}

// Panel de viaje: viajando → llegaste (Entrar + ciudad arriba) → elegir destino.
// M4: las acciones de la ciudad (Entrar / Explorar / Explorada) van SIEMPRE
// ANTES de la lista de destinos (nunca abajo de la página). Elegir una fila
// abre el cartel de 2 opciones (Viajar / Viajar, entrar y explorar).
function cityById(world, id) {
  return world.cities.find((c) => c.id === id) ?? null;
}

export function renderWorldPanel(world, state, worldTexts, storiesBag, balance, handlers) {
  const panel = document.getElementById('world-panel');
  if (!panel) {
    return;
  }
  panel.innerHTML = '';

  const arrived = state.trip !== null && tripArrived(state.trip);

  // Estado 1: viaje en curso → Viajando + Faltan + Cancelar.
  if (state.trip && !arrived) {
    const dest = cityById(world, state.trip.dest);

    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = fillText(textOf(worldTexts, 'travelText'), {
      label: worldTexts.travelingLabel,
      dest: dest ? dest.name : state.trip.dest,
    });
    panel.appendChild(title);

    const progress = document.createElement('p');
    progress.className = 'trip-progress';
    progress.textContent = fillText(textOf(worldTexts, 'progressText'), {
      label: worldTexts.progressLabel,
      pending: state.trip.cost - state.trip.progress,
    });
    panel.appendChild(progress);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'habit-btn neutral trip-cancel';
    cancel.textContent = worldTexts.cancelButton;
    cancel.addEventListener('click', handlers.onCancelTrip);
    panel.appendChild(cancel);
    return;
  }

  // Estado 2: llegaste (sin entrar todavía) → título + acciones de ciudad + lista.
  if (arrived) {
    const dest = cityById(world, state.trip.dest);
    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = fillText(textOf(worldTexts, 'arrivedText'), {
      label: worldTexts.arrivedLabel,
      dest: dest ? dest.name : state.trip.dest,
    });
    panel.appendChild(title);
  }

  // Acciones de la ciudad actual (arriba): Entrar (gratis) + Explorar/Explorada.
  appendCityActions(world, state, worldTexts, storiesBag, balance, handlers, panel, arrived);

  // Destinos (visibles también al llegar: sos libre de seguir viajando sin entrar).
  const title = document.createElement('p');
  title.className = 'panel-title';
  title.textContent = worldTexts.destinationsTitle;
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dest-list';
  for (const dest of destinationsFrom(world, state.currentCity)) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'dest-row';

    const name = document.createElement('span');
    // Dos caminos: "Ciudad · por Bahía" (plantilla destViaText + campo via).
    const via = dest.route?.via;
    name.textContent = via
      ? fillText(textOf(worldTexts, 'destViaText'), {
        city: dest.city.name,
        label: worldTexts.routeVia,
        route: via,
      })
      : dest.city.name;
    row.appendChild(name);

    const meta = document.createElement('span');
    meta.className = 'dest-meta';
    const dragonHint = dest.dragonEdge
      ? fillText(textOf(worldTexts, 'dragonSuffix'), { title: worldTexts.dragonTitle })
      : '';
    meta.textContent = fillText(textOf(worldTexts, 'destMetaText'), { cost: dest.cost, hint: dragonHint });
    row.appendChild(meta);

    row.addEventListener('click', () => handlers.onSelectDestination(dest));
    list.appendChild(row);
  }
  panel.appendChild(list);
}

// Acciones de la ciudad actual: "Entrar" (si no está registrada / al llegar)
// y debajo "Explorar" (solo habilitado si la ciudad está ENTRADA y con saldo)
// o la etiqueta "Explorada" + su historia (M5). Quedan sobre la lista de destinos.
function appendCityActions(world, state, worldTexts, storiesBag, balance, handlers, panel, arrived) {
  const city = cityById(world, state.currentCity);
  const cityName = city ? city.name : state.currentCity;
  const entered = state.visited.includes(state.currentCity);

  // Entrar: al llegar, o si estás parado en una ciudad sin registrar.
  if (arrived || !entered) {
    const enter = document.createElement('button');
    enter.type = 'button';
    enter.className = 'habit-btn complete dest-enter';
    enter.textContent = fillText(textOf(worldTexts, 'enterText'), {
      label: worldTexts.enterPrefix,
      city: cityName,
    });
    enter.addEventListener('click', handlers.onEnterCity);
    panel.appendChild(enter);
  }

  if (hasExplored(state, state.currentCity)) {
    const exploredTag = document.createElement('p');
    exploredTag.className = 'explored-tag';
    exploredTag.textContent = worldTexts.exploredLabel;
    panel.appendChild(exploredTag);

    // M5: historia de la ciudad bajo "Explorada". Si no está en
    // stories.json → nada + aviso en consola.
    const story = storiesBag?.[state.currentCity];
    if (typeof story === 'string' && story !== '') {
      const storyText = document.createElement('p');
      storyText.className = 'city-story';
      storyText.textContent = city ? fillText(story, { name: city.name }) : story;
      panel.appendChild(storyText);
    } else {
      console.warn('Falta la historia de la ciudad:', state.currentCity);
    }
    return;
  }

  // Explorar: nunca parcial — deshabilitado sin entrar o sin saldo suficiente.
  const cost = exploreCost(world);
  const explore = document.createElement('button');
  explore.type = 'button';
  explore.className = 'habit-btn neutral dest-explore';
  explore.textContent = fillText(textOf(worldTexts, 'exploreCostText'), {
    label: worldTexts.exploreButton,
    cost,
  });
  explore.disabled = !entered || balance < cost;
  explore.addEventListener('click', handlers.onExploreCity);
  panel.appendChild(explore);

  if (balance < cost) {
    const missing = document.createElement('p');
    missing.className = 'dest-not-enough';
    missing.textContent = fillText(textOf(worldTexts, 'notEnoughExplore'), {
      balance,
      missing: cost - balance,
    });
    panel.appendChild(missing);
  }
}
