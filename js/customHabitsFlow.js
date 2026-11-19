// V2 pieza 3 — pantalla de hábitos propios: form en línea + Editar/Archivar.
// La lógica (validación, tope, ids, auto-envío) ya está en customHabits.js:
// acá solo se conectan eventos, textos y el cartel de confirmación genérico.
import { textOf, fillText } from './text.js';
import {
  validateFields,
  createCustomHabit,
  editCustomHabit,
  archiveCustomHabit,
} from './customHabits.js';
import {
  showConfirm,
  hideConfirm,
  renderCustomFormTexts,
  showCustomForm,
  showCustomError,
  clearCustomError,
} from './ui.js';

export function setupCustomHabitsFlow({
  session,
  textsBag,
  getHabits,
  getCustoms,
  onCustomsChanged,
  refresh,
}) {
  const addButton = document.getElementById('add-habit-btn');
  const cancelButton = document.getElementById('custom-cancel');
  const form = document.getElementById('custom-form');
  const habitsList = document.getElementById('habits-list');
  const inputs = {
    label: document.getElementById('custom-label'),
    minDesc: document.getElementById('custom-min'),
    fullDesc: document.getElementById('custom-full'),
  };
  let editingId = null;

  function isFormOpen() {
    return Boolean(form && !form.hidden);
  }

  function clearFields() {
    for (const input of Object.values(inputs)) {
      if (input) {
        input.value = '';
      }
    }
  }

  function closeForm() {
    editingId = null;
    clearFields();
    clearCustomError();
    showCustomForm(false);
  }

  // Req. 4: si se archiva el hábito que se estaba editando, se cierra el form.
  function closeFormIfEditing(id) {
    if (editingId === id) {
      closeForm();
    }
  }

  function openForm(mode, habit) {
    editingId = mode === 'edit' ? habit.id : null;
    clearFields();
    if (habit) {
      if (inputs.label) {
        inputs.label.value = habit.label ?? '';
      }
      if (inputs.minDesc) {
        inputs.minDesc.value = habit.minDesc ?? '';
      }
      if (inputs.fullDesc) {
        inputs.fullDesc.value = habit.fullDesc ?? '';
      }
    }
    clearCustomError();
    const titleKey = mode === 'edit' ? 'customEditTitle' : 'customNewTitle';
    renderCustomFormTexts(textsBag, textOf(textsBag, titleKey));
    showCustomForm(true);
    refresh(); // recalcula el botón "Agregar hábito" (se oculta con el form abierto)
    if (inputs.label) {
      inputs.label.focus();
    }
  }

  function messageFor(reason) {
    const keys = {
      label: 'customErrorLabel',
      minDesc: 'customErrorMin',
      fullDesc: 'customErrorFull',
      full: 'customErrorSlots',
    };
    return textOf(textsBag, keys[reason] ?? 'customErrorLabel');
  }

  function submit(event) {
    event.preventDefault();
    const fields = {
      label: inputs.label?.value ?? '',
      minDesc: inputs.minDesc?.value ?? '',
      fullDesc: inputs.fullDesc?.value ?? '',
    };
    const checked = validateFields(fields);
    if (!checked.ok) {
      showCustomError(messageFor(checked.reason));
      return;
    }
    const result = editingId
      ? editCustomHabit(getCustoms(), editingId, fields)
      : createCustomHabit(getCustoms(), fields);
    if (!result.ok) {
      showCustomError(messageFor(result.reason));
      return;
    }
    onCustomsChanged(result.customs);
    closeForm();
    refresh();
  }

  function archive(id, habit) {
    const message = fillText(textOf(textsBag, 'customArchiveConfirm'), { label: habit.label });
    showConfirm(message, [
      {
        label: textOf(textsBag, 'confirmAcceptLabel'),
        className: 'confirm-accept',
        onClick: () => {
          const result = archiveCustomHabit(getCustoms(), session.daysData, id);
          hideConfirm();
          closeFormIfEditing(id); // req. 4
          onCustomsChanged(result.customs, result.daysData);
          refresh();
        },
      },
      {
        label: textOf(textsBag, 'confirmCancelLabel'),
        className: 'confirm-cancel',
        onClick: hideConfirm,
      },
    ]);
  }

  form?.addEventListener('submit', submit);
  addButton?.addEventListener('click', () => openForm('new', null));
  cancelButton?.addEventListener('click', () => {
    closeForm();
    refresh();
  });

  habitsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-custom-action]');
    if (!button) {
      return;
    }
    const id = button.closest('.habit')?.dataset.habitId;
    const habit = getHabits().find((item) => item.id === id);
    if (!habit) {
      return;
    }
    if (button.dataset.customAction === 'edit') {
      openForm('edit', habit);
    } else if (button.dataset.customAction === 'archive') {
      archive(id, habit);
    }
  });

  return { isFormOpen };
}
