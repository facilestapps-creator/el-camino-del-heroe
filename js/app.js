// Orquestador: carga datos, define el estado de sesión, separa ACTUALIZAR
// (updateState: efectos + guardado) de DIBUJAR (renderAll: solo lectura) y
// conecta los 3 flujos (hábitos, mundo, respaldo) vía refresh().
import { loadDays } from './storage.js';
import { loadJSON } from './dataFiles.js';
import { textOf } from './text.js';
import {
  getHabitsData,
  getTodayLevels,
  computeDayPoints,
  computeTotalSent,
  sendPastDays,
  migrateDaysData,
} from './habits.js';
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
import { createWorldFlow } from './worldFlow.js';
import { renderLastBackupLine, setupBackupFlow } from './backupFlow.js';

async function main() {
  const texts = await loadJSON('texts');
  const textsBag = texts.texts ?? {};
  // Las historias por ciudad también viven en data/ (nada hardcodeado).
  const storiesData = await loadJSON('stories');
  const storiesBag = storiesData.stories ?? {};

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
  const habits = habitsData.habits ?? [];
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

  // Estado compartido de la sesión: lo mutan los flujos, lo lee el render.
  const session = {
    daysData: initialDays,
    levelsByHabit: getTodayLevels(initialDays),
    worldState,
  };

  function computeBalance() {
    return Math.max(0, computeTotalSent(session.daysData) - session.worldState.spent);
  }

  // ACTUALIZAR: efectos sobre el estado (flujo del viaje + llegada) y guardado.
  function updateState() {
    // Viaje progresivo: mientras haya viaje activo, el saldo disponible fluye solo.
    if (flowBalanceToTrip(session.worldState, computeBalance()) > 0) {
      saveWorldState(session.worldState);
    }
    // Al completarse el viaje, la llegada te deja en la ciudad destino.
    if (settleArrival(session.worldState)) {
      saveWorldState(session.worldState);
    }
  }

  // DIBUJAR: solo lectura del estado, sin efectos secundarios.
  function renderAll() {
    const { sent, pending } = computeDayPoints(session.levelsByHabit, habits);
    renderHabitList(habits, session.levelsByHabit, textsBag, stepsPerPoint);
    renderPoints(sent, pending, pointLines, pointVars);
    renderSendButton(pending, sendText, textOf(textsBag, 'sendLabel'));
    renderBalance(computeBalance(), balanceText, textsBag.balanceLabel);
    renderWorldMap(world, session.worldState, worldTexts);
    renderWorldBalance(computeBalance(), balanceText, textsBag.balanceLabel);
    renderWorldPanel(world, session.worldState, worldTexts, storiesBag, computeBalance(), panelHandlers);
  }

  // Orquestador: todo cambio de estado pasa por acá (actualizar + dibujar).
  function refresh() {
    updateState();
    renderAll();
  }

  const { panelHandlers } = createWorldFlow({ world, session, textsBag, computeBalance, refresh });

  setupHabitsFlow({ session, habits, stepsPerPoint, maxSteps, textsBag, refresh });
  setupBackupFlow({ textsBag, onExported: () => renderLastBackupLine(textsBag) });

  renderViewToggle(textOf(textsBag, 'habitsTitle'), worldTexts.worldTitle);
  showView(currentView);
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
