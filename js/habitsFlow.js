// Flujo de hábitos: tap por nivel, campo de pasos (validación) y Enviar.
// Los handlers mutan session.* → guardan → refresh() (el orquestador de app).
import {
  getLevelValue,
  saveTodayLevel,
  saveSteps,
  validateSteps,
  sendTodayPoints,
  getTodayLevels,
} from './habits.js';
import { showStepsError, clearStepsError } from './ui.js';
import { textOf, fillText } from './text.js';

export function setupHabitsFlow({ session, habits, stepsPerPoint, maxSteps, textsBag, refresh }) {
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

    const currentLevel = getLevelValue(session.levelsByHabit[habitId]);
    let nextLevel;
    if (button.dataset.level !== undefined) {
      // Boton directo: elige el nivel; tocar el activo lo desmarca.
      const desiredLevel = Number(button.dataset.level);
      nextLevel = currentLevel === desiredLevel ? 0 : desiredLevel;
    } else {
      // Boton ciclico (estado inicial -> minimo -> completo -> inicial).
      nextLevel = currentLevel === 0 ? 1 : currentLevel === 1 ? 2 : 0;
    }

    session.daysData = saveTodayLevel(session.daysData, habitId, nextLevel, habit);
    session.levelsByHabit = getTodayLevels(session.daysData);
    refresh();
  });

  // M3: pasos manuales (ingreso manual del total del día). M2: validación de
  // mínimo (lo ya enviado) y tope (maxSteps). En rechazo: no se guarda, el
  // campo vuelve al último valor guardado y se muestra el mensaje debajo (sin
  // refresh, que destruiría el span del mensaje).
  habitsList.addEventListener('change', (event) => {
    const input = event.target.closest('.habit-steps');
    if (!input) {
      return;
    }
    const habitId = input.dataset.stepsHabit;
    const validation = validateSteps(session.levelsByHabit[habitId], input.value, stepsPerPoint, maxSteps);
    if (!validation.ok) {
      const entry = session.levelsByHabit[habitId];
      input.value = entry && typeof entry === 'object' && typeof entry.steps === 'number'
        ? entry.steps
        : 0;
      const template = validation.reason === 'min'
        ? textOf(textsBag, 'stepsMinMessage')
        : textOf(textsBag, 'stepsMaxMessage');
      const message = validation.reason === 'min'
        ? fillText(template, { points: session.levelsByHabit[habitId]?.sentPoints ?? 0, min: validation.min })
        : fillText(template, { max: validation.max });
      showStepsError(habitId, message);
      return;
    }
    session.daysData = saveSteps(session.daysData, habitId, input.value, stepsPerPoint, maxSteps);
    session.levelsByHabit = getTodayLevels(session.daysData);
    clearStepsError(habitId);
    refresh();
  });

  // M3: Enviar pendientes del día (varias veces por día).
  document.getElementById('send-btn').addEventListener('click', () => {
    session.daysData = sendTodayPoints(session.daysData);
    session.levelsByHabit = getTodayLevels(session.daysData);
    refresh();
  });
}
