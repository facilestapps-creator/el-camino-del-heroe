import { textOf } from './text.js';

export function renderAppName(name) {
  const element = document.getElementById('app-name');
  if (element) {
    element.textContent = name;
  }
}

export function renderCharacterName(name) {
  const element = document.getElementById('character-name');
  if (element) {
    element.textContent = name;
  }
}

export function renderGoalName(name) {
  const element = document.getElementById('goal-name');
  if (element) {
    element.textContent = name;
  }
}

export function renderHabitsTitle(title) {
  const element = document.getElementById('habits-title');
  if (element) {
    element.textContent = title;
  }
}

export function renderHabitList(habits, levelsByHabit, texts, stepsPerPoint) {
  const container = document.getElementById('habits-list');
  container.innerHTML = '';

  for (const habit of habits) {
    const entry = levelsByHabit?.[habit.id];
    const level = getLevelOf(entry);
    // M3: un hábito ya enviado (sentPoints > 0) queda bloqueado el día.
    // M1 (arreglo de pasos): el campo de pasos NUNCA se bloquea — la regla
    // sigue para los hábitos por niveles.
    const locked = habit.style !== 'number'
      && typeof entry === 'object' && entry !== null && (entry.sentPoints ?? 0) > 0;

    const row = document.createElement('div');
    row.className = habit.style === 'direct' ? 'habit habit-direct' : 'habit';
    if (habit.style === 'number') {
      row.className = 'habit habit-number';
    }
    if (locked) {
      row.classList.add('locked');
    }
    row.dataset.habitId = habit.id;

    const info = document.createElement('div');
    info.className = 'habit-info';

    const label = document.createElement('span');
    label.className = 'habit-label';
    label.textContent = habit.label;
    info.appendChild(label);

    // M3: pasos con ingreso manual (total del día) y su regla debajo.
    if (habit.style === 'number') {
      const rule = document.createElement('span');
      rule.className = 'habit-number-rule';
      rule.textContent = textOf(texts, 'stepsRule')
        .replace('{stepsPerPoint}', String(stepsPerPoint));
      info.appendChild(rule);

      const input = document.createElement('input');
      input.className = 'habit-steps';
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.inputMode = 'numeric';
      input.dataset.stepsHabit = habit.id;
      input.value = String(typeof entry?.steps === 'number' ? entry.steps : 0);
      input.disabled = locked;

      row.appendChild(info);
      row.appendChild(input);
      container.appendChild(row);
      if (locked) {
        row.appendChild(lockedTag(texts));
      }
      continue;
    }

    // Experimento (solo habits con style "direct"): dos botones directos,
    // cada uno con su descripcion debajo. Sin descripciones a la izquierda.
    if (habit.style === 'direct') {
      const actions = document.createElement('div');
      actions.className = 'habit-actions';

      const options = [
        { value: 1, text: texts.habitMin, desc: habit.minDesc },
        { value: 2, text: texts.habitComplete, desc: habit.fullDesc },
      ];

      for (const option of options) {
        const wrap = document.createElement('div');
        wrap.className = 'habit-action';

        const button = document.createElement('button');
        button.className = `habit-btn habit-btn-direct${level === option.value ? ` state-${option.value}` : ''}`;
        button.type = 'button';
        button.dataset.habitId = habit.id;
        button.dataset.level = String(option.value);
        button.textContent = option.text;
        button.disabled = locked;

        const desc = document.createElement('span');
        desc.className = 'habit-action-desc';
        desc.textContent = option.desc;

        wrap.appendChild(button);
        wrap.appendChild(desc);
        actions.appendChild(wrap);
      }

      row.appendChild(info);
      row.appendChild(actions);
      container.appendChild(row);
      if (locked) {
        row.appendChild(lockedTag(texts));
      }
      continue;
    }

    // Bloque A: minDesc y fullDesc siempre visibles a la vez.
    const descMin = document.createElement('span');
    descMin.className = 'habit-desc';
    descMin.textContent = habit.minDesc;

    const descFull = document.createElement('span');
    descFull.className = 'habit-desc habit-desc-full';
    descFull.textContent = habit.fullDesc;

    info.appendChild(descMin);
    info.appendChild(descFull);

    const button = document.createElement('button');
    button.className = `habit-btn state-${level}`;
    button.type = 'button';
    button.dataset.habitId = habit.id;
    button.disabled = locked;
    button.textContent = level === 0 ? texts.habitStart : level === 1 ? texts.habitMin : texts.habitComplete;

    row.appendChild(info);
    row.appendChild(button);
    container.appendChild(row);
    if (locked) {
      row.appendChild(lockedTag(texts));
    }
  }
}

// Marca visible de "ya enviado" junto al hábito bloqueado.
function lockedTag(texts) {
  const tag = document.createElement('span');
  tag.className = 'habit-locked-tag';
  tag.textContent = textOf(texts, 'habitLocked');
  return tag;
}

// M2: aviso de validación debajo del campo de pasos. El mensaje ya viene
// armado (textOf + fillText) de quien llama; solo se muestra/oculta acá.
export function showStepsError(habitId, message) {
  const row = document.querySelector(`.habit[data-habit-id="${habitId}"]`);
  if (!row) {
    return;
  }
  let element = row.querySelector('.habit-steps-error');
  if (!element) {
    element = document.createElement('span');
    element.className = 'habit-steps-error';
    row.appendChild(element);
  }
  element.textContent = message;
}

export function clearStepsError(habitId) {
  const row = document.querySelector(`.habit[data-habit-id="${habitId}"]`);
  const element = row?.querySelector('.habit-steps-error');
  if (element) {
    element.remove();
  }
}

// Acepta formato viejo (numero) y formato nuevo ({ level, points }).
function getLevelOf(entry) {
  if (typeof entry === 'object' && entry !== null) {
    return entry.level ?? 0;
  }
  return typeof entry === 'number' ? entry : 0;
}

// M3: "Puntos de hoy" muestra enviados + pendientes (los pendientes se
// distinguen visualmente con su propia clase).
export function renderPoints(sent, pending, label, pendingLabel) {
  const element = document.getElementById('points-total');
  if (!element) {
    return;
  }
  element.textContent = '';

  const sentSpan = document.createElement('span');
  sentSpan.id = 'points-count';
  sentSpan.textContent = String(sent);

  const labelSpan = document.createElement('span');
  labelSpan.textContent = ` ${label}`;

  element.appendChild(sentSpan);
  element.appendChild(labelSpan);

  if (pending > 0) {
    const pendingWrap = document.createElement('span');
    pendingWrap.className = 'points-pending';

    const pendingSpan = document.createElement('span');
    pendingSpan.className = 'points-pending-count';
    pendingSpan.textContent = `+${pending}`;

    const pendingText = document.createElement('span');
    pendingText.textContent = ` ${pendingLabel}`;

    pendingWrap.appendChild(pendingSpan);
    pendingWrap.appendChild(pendingText);
    element.appendChild(pendingWrap);
  }
}

// M3: botón Enviar bajo la lista de hábitos (deshabilitado si no hay
// pendientes).
export function renderSendButton(pending, label) {
  const button = document.getElementById('send-btn');
  if (!button) {
    return;
  }
  button.textContent = `${label} (${pending})`;
  button.disabled = pending <= 0;
}

export function renderBalance(balance, label) {
  const element = document.getElementById('points-balance');
  if (element) {
    element.textContent = `${label}: ${balance}`;
  }
}

// Bloque B: textos de los botones de respaldo.
export function renderBackupTexts(exportLabel, importLabel) {
  const exportButton = document.getElementById('backup-export');
  if (exportButton) {
    exportButton.textContent = exportLabel;
  }
  const importLabelElement = document.getElementById('backup-import-label');
  if (importLabelElement) {
    importLabelElement.textContent = importLabel;
  }
}

// M6: "Último respaldo: …" bajo los botones. highlight = nunca / ≥ umbral.
export function renderLastBackup(message, highlight) {
  const element = document.getElementById('backup-last');
  if (!element) {
    return;
  }
  element.textContent = message;
  element.hidden = message === '';
  element.classList.toggle('backup-last--stale', Boolean(highlight));
}

// Bloque B: mensaje de error bajo los botones de respaldo.
export function showBackupError(message) {
  const element = document.getElementById('backup-error');
  if (element) {
    element.textContent = message;
    element.hidden = false;
  }
}

export function clearBackupError() {
  const element = document.getElementById('backup-error');
  if (element) {
    element.textContent = '';
    element.hidden = true;
  }
}

// M4: cartel genérico de confirmación. Recibe el mensaje (opcional) y los
// botones a mostrar: [{ label, className, onClick }].
// Reemplaza al viejo showBackupConfirm (Bloque B) y ahora lo usan también
// los carteles de viaje.
export function showConfirm(message, buttons) {
  const overlay = document.getElementById('confirm-overlay');
  const textElement = document.getElementById('confirm-text');
  const actions = document.getElementById('confirm-actions');
  if (textElement) {
    textElement.textContent = message;
  }
  if (actions) {
    actions.innerHTML = '';
    for (const spec of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `confirm-btn ${spec.className ?? 'confirm-cancel'}`;
      button.textContent = spec.label;
      button.addEventListener('click', spec.onClick);
      actions.appendChild(button);
    }
  }
  if (overlay) {
    overlay.hidden = false;
  }
}

export function hideConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) {
    overlay.hidden = true;
  }
}
