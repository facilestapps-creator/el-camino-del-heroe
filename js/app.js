// Orquestador: carga datos, define el estado de sesión, separa ACTUALIZAR
// (updateState: efectos + guardado) de DIBUJAR (renderAll: solo lectura) y
// conecta los 3 flujos (hábitos, mundo, respaldo) vía refresh().
import {
  loadDays, loadCustomHabits, loadCharacterState, saveCharacterState,
} from './storage.js';
import { syncOfferOnCityChange } from './character.js';
import { loadJSON } from './dataFiles.js';
import { textOf } from './text.js';
import {
  getHabitsData,
  getTodayKey,
  getTodayLevels,
  computeDayPoints,
  computeTotalSent,
  sendPastDays,
  migrateDaysData,
} from './habits.js';
import { activeCustomHabits, occupiedSlots, MAX_SLOTS } from './customHabits.js';
import {
  renderAppName,
  renderCharacterName,
  renderGoalName,
  renderHabitsTitle,
  renderHabitList,
  renderPoints,
  renderBalance,
  renderSendButton,
  renderBackupTexts,
  renderCustomControls,
  renderCustomFormTexts,
} from './ui.js';
import {
  getWorld,
  loadWorldState,
  saveWorldState,
  flowBalanceToTrip,
  settleArrival,
} from './world.js';
import {
  renderViewToggle,
  showView,
  renderWorldMap,
  renderWorldBalance,
  renderWorldPanel,
} from './worldUI.js';
import { setupHabitsFlow } from './habitsFlow.js';
import { setupCustomHabitsFlow } from './customHabitsFlow.js';
import { createWorldFlow } from './worldFlow.js';
import { renderLastBackupLine, setupBackupFlow } from './backupFlow.js';
import { setupMapZoom } from './mapZoom.js';

async function main() {
  const texts = await loadJSON('texts');
  const textsBag = texts.texts ?? {};
  // Las historias por ciudad también viven en data/ (nada hardcodeado).
  const storiesData = await loadJSON('stories');
  const storiesBag = storiesData.stories ?? {};
  // Catálogo del personaje: mismo loader (fetch con cache: 'no-store').
  const itemsData = await loadJSON('items');

  // Plantillas con variables: se arman SIEMPRE con fillText, nunca concatenando
  // en código (los textos se editan en data/). Se leen una vez (son estáticas).
  const pointLines = {
    label: textOf(textsBag, 'pointsLabelLine'),
    count: textOf(textsBag, 'pendingCountLine'),
    pending: textOf(textsBag, 'pendingLabelLine'),
  };
  const pointVars = {
    label: textOf(textsBag, 'pointsLabel'),
    pendingLabel: textOf(textsBag, 'pendingLabel'),
  };
  const balanceText = textOf(textsBag, 'balanceText');
  const sendText = textOf(textsBag, 'sendText');

  renderAppName(texts.appName);
  renderCharacterName(texts.characterName);
  renderGoalName(texts.goalName);
  renderHabitsTitle(textOf(textsBag, 'habitsTitle'));
  renderBackupTexts(textsBag.exportLabel, textsBag.importLabel);
  // "Último respaldo: …" bajo los botones (resaltado si nunca o ≥ umbral).
  renderLastBackupLine(textsBag);

  document.title = texts.appName;

  const habitsData = await getHabitsData();
  // getHabitsData() ya descarta entradas corruptas: se repite el filtro acá
  // para que la lista de ids propios sea la misma que se va a dibujar.
  const rawCustoms = loadCustomHabits().filter(
    (habit) => typeof habit === 'object' && habit !== null && !Array.isArray(habit),
  );
  const customIdSet = new Set(rawCustoms.map((habit) => habit.id));
  const baseHabits = (habitsData.habits ?? []).filter((habit) => !customIdSet.has(habit.id));
  let customs = rawCustoms;
  let habits = [...baseHabits, ...activeCustomHabits(customs)];
  let customFlow;
  const stepsPerPoint = typeof habitsData.stepsPerPoint === 'number' ? habitsData.stepsPerPoint : 700;
  const maxSteps = typeof habitsData.maxSteps === 'number' ? habitsData.maxSteps : 30000;

  // Al arrancar los pendientes de días anteriores se envían solos, para que
  // no queden puntos trabados en días viejos.
  const initialDays = sendPastDays(migrateDaysData(loadDays(), habits));

  // Estado del mundo: se carga y se re-guarda para normalizar lo persistido.
  const world = await getWorld();
  const worldState = loadWorldState(world);
  saveWorldState(worldState);
  const worldTexts = world.texts ?? {};
  let currentView = 'hoy';
  // Se inicializa ANTES del primer refresh(): la detección de cambio de ciudad
  // solo actúa cuando currentCity difiere de este valor.
  let previousCityId = worldState.currentCity;

  // Estado compartido de la sesión: lo mutan los flujos, lo lee el render.
  const session = {
    daysData: initialDays,
    levelsByHabit: getTodayLevels(initialDays),
    worldState,
    characterState: loadCharacterState(),
  };

  function computeBalance() {
    return Math.max(0, computeTotalSent(session.daysData) - session.worldState.spent);
  }

  // ACTUALIZAR: efectos sobre el estado (flujo del viaje + llegada) y guardado.
  function updateState() {
    // Captura del viaje que puede llegar: settleArrival() borra el trip cuando
    // era "Viajar, entrar y explorar", y necesitamos ese dato para generar la
    // oferta de la ciudad nueva (incluido el caso "llegó con la app cerrada").
    const trip = session.worldState.trip;
    const arrivingTrip = trip ? { dest: trip.dest, withExplore: trip.withExplore } : null;

    // Viaje progresivo: mientras haya viaje activo, el saldo disponible fluye solo.
    if (flowBalanceToTrip(session.worldState, computeBalance()) > 0) {
      saveWorldState(session.worldState);
    }
    // Al completarse el viaje, la llegada te deja en la ciudad destino.
    if (settleArrival(session.worldState)) {
      saveWorldState(session.worldState);
    }

    // Único lugar que decide cambio de oferta: solo si currentCity cambió.
    const synced = syncOfferOnCityChange({
      previousCityId,
      worldState: session.worldState,
      characterState: session.characterState,
      catalog: itemsData,
      arrivingTrip,
    });
    previousCityId = synced.previousCityId;
    if (synced.characterState !== session.characterState) {
      session.characterState = synced.characterState;
      saveCharacterState(session.characterState);
    }
  }

  // DIBUJAR: solo lectura del estado, sin efectos secundarios.
  function renderAll() {
    const { sent, pending } = computeDayPoints(session.levelsByHabit, habits);
    const activeIds = new Set(activeCustomHabits(customs).map((habit) => habit.id));
    // Se recalcula en CADA refresh (también el de visibilitychange): un hábito
    // archivado ayer deja de ocupar lugar aunque la pestaña siga abierta.
    const canAdd = occupiedSlots(customs, getTodayKey()) < MAX_SLOTS;
    renderHabitList(habits, session.levelsByHabit, textsBag, stepsPerPoint, activeIds);
    renderCustomControls({ canAdd, formOpen: customFlow?.isFormOpen() ?? false, texts: textsBag });
    renderPoints(sent, pending, pointLines, pointVars);
    renderSendButton(pending, sendText, textOf(textsBag, 'sendLabel'));
    renderBalance(computeBalance(), balanceText, textsBag.balanceLabel);
    renderWorldMap(world, session.worldState, worldTexts);
    renderWorldBalance(computeBalance(), balanceText, textsBag.balanceLabel);
    renderWorldPanel(
      world, session.worldState, worldTexts, storiesBag, computeBalance(), panelHandlers,
      session.characterState, itemsData, textsBag,
    );
  }

  // Orquestador: todo cambio de estado pasa por acá (actualizar + dibujar).
  function refresh() {
    updateState();
    renderAll();
  }

  const { panelHandlers } = createWorldFlow({
    world, session, textsBag, computeBalance, refresh, catalog: itemsData,
  });

  setupHabitsFlow({ session, getHabits: () => habits, stepsPerPoint, maxSteps, textsBag, refresh });
  customFlow = setupCustomHabitsFlow({
    session,
    textsBag,
    getHabits: () => habits,
    getCustoms: () => customs,
    onCustomsChanged: (nextCustoms, nextDaysData) => {
      customs = nextCustoms;
      habits = [...baseHabits, ...activeCustomHabits(customs)];
      if (nextDaysData) {
        session.daysData = nextDaysData;
        session.levelsByHabit = getTodayLevels(nextDaysData);
      }
    },
    refresh,
  });
  renderCustomFormTexts(textsBag, textOf(textsBag, 'customNewTitle'));
  setupBackupFlow({ textsBag, onExported: () => renderLastBackupLine(textsBag) });

  renderViewToggle(textOf(textsBag, 'habitsTitle'), worldTexts.worldTitle);
  showView(currentView);
  setupMapZoom();
  refresh();

  document.getElementById('view-hoy-btn').addEventListener('click', () => {
    currentView = 'hoy';
    showView(currentView);
  });
  document.getElementById('view-world-btn').addEventListener('click', () => {
    currentView = 'world';
    showView(currentView);
  });

  // Al volver a ser visible, recalcular la fecha de hoy y recargar el día:
  // la pestaña pudo quedarse abierta de ayer.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    session.daysData = migrateDaysData(loadDays(), habits);
    session.daysData = sendPastDays(session.daysData);
    session.levelsByHabit = getTodayLevels(session.daysData);
    refresh();
  });
}

main();
