import { loadJSON, loadDays } from './storage.js';
import { textOf, fillText } from './text.js';
import {
  getHabitsData,
  getTodayLevels,
  getLevelValue,
  saveTodayLevel,
  saveSteps,
  validateSteps,
  computeDayPoints,
  computeTotalSent,
  sendTodayPoints,
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
  renderLastBackup,
  showBackupError,
  clearBackupError,
  showConfirm,
  hideConfirm,
  showStepsError,
  clearStepsError,
} from './ui.js';
import {
  exportBackup,
  parseBackupText,
  isValidBackup,
  applyBackup,
  loadMeta,
  daysSinceBackup,
} from './backup.js';
import { BACKUP_STALE_DAYS } from './config.js';
import {
  getWorld,
  loadWorldState,
  saveWorldState,
  flowBalanceToTrip,
  settleArrival,
  startTrip,
  cancelTrip,
  enterCity,
  exploreCost,
  exploreCity,
  rollDragon,
} from './world.js';
import {
  renderViewToggle,
  showView,
  renderWorldMap,
  renderWorldBalance,
  renderWorldPanel,
  showDragonCoin,
} from './worldUI.js';

async function main() {
  const texts = await loadJSON('texts');
  const textsBag = texts.texts ?? {};
  // M5: historias por ciudad (data/stories.json).
  const storiesData = await loadJSON('stories');
  const storiesBag = storiesData.stories ?? {};

  renderAppName(texts.appName);
  renderCharacterName(texts.characterName);
  renderGoalName(texts.goalName);
  renderHabitsTitle(textOf(textsBag, 'habitsTitle'));
  renderBackupTexts(textsBag.exportLabel, textsBag.importLabel);

  // M6: "Último respaldo: …" bajo los botones (resaltado si nunca o ≥ umbral).
  function renderLastBackupLine() {
    const days = daysSinceBackup(loadMeta());
    let message = '';
    let highlight = false;
    if (days === null) {
      message = textOf(textsBag, 'lastBackupNever');
      highlight = true;
    } else if (days === 0) {
      message = textOf(textsBag, 'lastBackupToday');
    } else if (days === 1) {
      message = textOf(textsBag, 'lastBackupOneDay');
    } else {
      message = fillText(textOf(textsBag, 'lastBackupDays'), { days });
    }
    if (days !== null && days >= BACKUP_STALE_DAYS) {
      highlight = true;
    }
    renderLastBackup(message, highlight);
  }
  renderLastBackupLine();

  document.title = texts.appName;

  const habitsData = await getHabitsData();
  const habits = habitsData.habits ?? [];
  const stepsPerPoint = typeof habitsData.stepsPerPoint === 'number' ? habitsData.stepsPerPoint : 700;
  const maxSteps = typeof habitsData.maxSteps === 'number' ? habitsData.maxSteps : 30000;

  let daysData = migrateDaysData(loadDays(), habits);
  // M3: cambio de día — los pendientes de días anteriores se envían solos.
  daysData = sendPastDays(daysData);
  let levelsByHabit = getTodayLevels(daysData);

  // Fase 2: estado del mundo.
  const world = await getWorld();
  let worldState = loadWorldState(world);
  saveWorldState(worldState);
  const worldTexts = world.texts ?? {};
  let currentView = 'hoy';

  function computeBalance() {
    return Math.max(0, computeTotalSent(daysData) - worldState.spent);
  }

  // Viaje progresivo: mientras haya viaje activo, el saldo disponible fluye solo.
  function applyTripFlow() {
    if (flowBalanceToTrip(worldState, computeBalance()) > 0) {
      saveWorldState(worldState);
    }
  }

  function renderAll() {
    applyTripFlow();
    // M4: al completarse el viaje, la llegada te deja en la ciudad destino.
    if (settleArrival(worldState)) {
      saveWorldState(worldState);
    }
    const { sent, pending } = computeDayPoints(levelsByHabit, habits);
    renderHabitList(habits, levelsByHabit, textsBag, stepsPerPoint);
    renderPoints(sent, pending, textOf(textsBag, 'pointsLabel'), textOf(textsBag, 'pendingLabel'));
    renderSendButton(pending, textOf(textsBag, 'sendLabel'));
    renderBalance(computeBalance(), textsBag.balanceLabel);
    renderWorldMap(world, worldState, worldTexts);
    renderWorldBalance(computeBalance(), textsBag.balanceLabel);
    renderWorldPanel(world, worldState, worldTexts, storiesBag, computeBalance(), {
      // M4: elegir una ciudad abre el cartel de 2 opciones (sin Viajar suelto).
      // Con dos caminos la fila trae el objeto destino completo (el .find por
      // cityId elegiría siempre la primera ruta).
      onSelectDestination: (found) => {
        if (!found) {
          return;
        }
        const cityName = found.city.name;
        showConfirm('', [
          {
            label: fillText(textOf(worldTexts, 'travelOnlyOption'), { city: cityName }),
            className: 'confirm-accept confirm-go',
            onClick: () => choosePlan(found, false),
          },
          {
            label: fillText(textOf(worldTexts, 'travelFullOption'), { city: cityName }),
            className: 'confirm-accept confirm-go',
            onClick: () => choosePlan(found, true),
          },
          {
            label: textOf(textsBag, 'confirmCancelLabel'),
            className: 'confirm-cancel',
            onClick: hideConfirm,
          },
        ]);
      },
      onCancelTrip: () => {
        cancelTrip(worldState);
        saveWorldState(worldState);
        renderAll();
      },
      onEnterCity: () => {
        enterCity(worldState);
        saveWorldState(worldState);
        renderAll();
      },
      onExploreCity: () => {
        exploreCity(world, worldState, computeBalance());
        saveWorldState(worldState);
        renderAll();
      },
    });
  }

  // M4: tras elegir opción (y la moneda si hay dragón), verificar el saldo.
  // Con saldo suficiente el viaje empieza directo; sin saldo, cartel que
  // ofrece empezar igual (Aceptar) o no hacer nada (Cancelar).
  function choosePlan(found, withExplore) {
    hideConfirm();
    const beginTrip = (withDragon) => {
      const travelCost = withDragon ? found.costWithDragon : found.cost;
      const finalCost = withExplore ? travelCost + exploreCost(world) : travelCost;
      const start = () => {
        startTrip(worldState, found.city.id, finalCost, withDragon, withExplore, found.route);
        saveWorldState(worldState);
        renderAll();
      };
      const balance = computeBalance();
      if (balance >= finalCost) {
        start();
        return;
      }
      showConfirm(fillText(textOf(worldTexts, 'notEnoughTravel'), {
        balance,
        missing: finalCost - balance,
      }), [
        {
          label: textOf(textsBag, 'confirmAcceptLabel'),
          className: 'confirm-accept confirm-go',
          onClick: () => {
            hideConfirm();
            start();
          },
        },
        {
          label: textOf(textsBag, 'confirmCancelLabel'),
          className: 'confirm-cancel',
          onClick: hideConfirm,
        },
      ]);
    };
    if (found.dragonEdge) {
      const roll = rollDragon(worldState, world, found.dragonEdge.id);
      // Resultado persistido AL TIRAR (M2): recargar no permite re-tirar.
      saveWorldState(worldState);
      showDragonCoin(world, roll, beginTrip);
    } else {
      beginTrip(false);
    }
  }

  renderViewToggle(textOf(textsBag, 'habitsTitle'), worldTexts.worldTitle);
  showView(currentView);
  renderAll();

  document.getElementById('view-hoy-btn').addEventListener('click', () => {
    currentView = 'hoy';
    showView(currentView);
  });
  document.getElementById('view-world-btn').addEventListener('click', () => {
    currentView = 'world';
    showView(currentView);
  });

  const habitsList = document.getElementById('habits-list');
  habitsList.addEventListener('click', (event) => {
    const button = event.target.closest('.habit-btn');
    if (!button) {
      return;
    }

    const habitId = button.dataset.habitId;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return;
    }

    const currentLevel = getLevelValue(levelsByHabit[habitId]);
    let nextLevel;
    if (button.dataset.level !== undefined) {
      // Boton directo: elige el nivel; tocar el activo lo desmarca.
      const desiredLevel = Number(button.dataset.level);
      nextLevel = currentLevel === desiredLevel ? 0 : desiredLevel;
    } else {
      // Boton ciclico (estado inicial -> minimo -> completo -> inicial).
      nextLevel = currentLevel === 0 ? 1 : currentLevel === 1 ? 2 : 0;
    }

    daysData = saveTodayLevel(daysData, habitId, nextLevel, habit);
    levelsByHabit = getTodayLevels(daysData);
    renderAll();
  });

  // M3: pasos manuales (ingreso manual del total del día). M2: validación de
  // mínimo (lo ya enviado) y tope (maxSteps). En rechazo: no se guarda, el
  // campo vuelve al último valor guardado y se muestra el mensaje debajo (sin
  // renderAll, que destruiría el span del mensaje).
  habitsList.addEventListener('change', (event) => {
    const input = event.target.closest('.habit-steps');
    if (!input) {
      return;
    }
    const habitId = input.dataset.stepsHabit;
    const validation = validateSteps(levelsByHabit[habitId], input.value, stepsPerPoint, maxSteps);
    if (!validation.ok) {
      const entry = levelsByHabit[habitId];
      input.value = entry && typeof entry === 'object' && typeof entry.steps === 'number'
        ? entry.steps
        : 0;
      const template = validation.reason === 'min'
        ? textOf(textsBag, 'stepsMinMessage')
        : textOf(textsBag, 'stepsMaxMessage');
      const message = validation.reason === 'min'
        ? fillText(template, { points: levelsByHabit[habitId]?.sentPoints ?? 0, min: validation.min })
        : fillText(template, { max: validation.max });
      showStepsError(habitId, message);
      return;
    }
    daysData = saveSteps(daysData, habitId, input.value, stepsPerPoint, maxSteps);
    levelsByHabit = getTodayLevels(daysData);
    clearStepsError(habitId);
    renderAll();
  });

  // M3: Enviar pendientes del día (varias veces por día).
  document.getElementById('send-btn').addEventListener('click', () => {
    daysData = sendTodayPoints(daysData);
    levelsByHabit = getTodayLevels(daysData);
    renderAll();
  });

  // Bloque B: exportar respaldo (mini-bloque 2). M6: al exportar se registra
  // la fecha y se refresca el contador "Último respaldo".
  document.getElementById('backup-export').addEventListener('click', () => {
    exportBackup();
    renderLastBackupLine();
  });

  // Bloque B: importar — elegir, validar, confirmar y aplicar.
  let pendingBackup = null;
  const fileInput = document.getElementById('backup-file-input');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackupText(reader.result);
      if (result.ok && isValidBackup(result.backup)) {
        clearBackupError();
        pendingBackup = result.backup;
        showConfirm(textsBag.importConfirmMessage, [
          {
            label: textsBag.confirmAcceptLabel,
            className: 'confirm-accept',
            onClick: () => {
              if (pendingBackup) {
                applyBackup(pendingBackup);
                pendingBackup = null;
                location.reload();
              }
            },
          },
          {
            label: textsBag.confirmCancelLabel,
            className: 'confirm-cancel',
            onClick: () => {
              pendingBackup = null;
              hideConfirm();
            },
          },
        ]);
      } else {
        showBackupError(textsBag.importInvalidMessage);
      }
    };
    reader.onerror = () => showBackupError(textsBag.importInvalidMessage);
    reader.readAsText(file);
  });

  // Bloque A: al volver a ser visible, recalcular fecha de hoy y recargar el dia.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    daysData = migrateDaysData(loadDays(), habits);
    // M3: cambio de día (puede pasar mientras estuvo oculta la pestaña).
    daysData = sendPastDays(daysData);
    levelsByHabit = getTodayLevels(daysData);
    renderAll();
  });
}

main();
