// Flujo de respaldo: exportar/importar y la línea "Último respaldo".
// Orquestación UI ↔ lógica de respaldo; no muta estado del juego.
import { textOf, fillText } from './text.js';
import {
  exportBackup,
  parseBackupText,
  isValidBackup,
  applyBackup,
  loadMeta,
  daysSinceBackup,
} from './backup.js';
import {
  showConfirm,
  hideConfirm,
  showBackupError,
  clearBackupError,
  renderLastBackup,
} from './ui.js';
import { BACKUP_STALE_DAYS } from './config.js';

// La línea avisa qué tan viejo está el último respaldo (resaltado si nunca o ≥ umbral).
export function renderLastBackupLine(textsBag) {
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

// Conecta los botones de respaldo de la vista "Hoy".
// onExported: se llama después de exportar (para refrescar la línea de arriba).
export function setupBackupFlow({ textsBag, onExported }) {
  // Al exportar se registra la fecha y se refresca el contador "Último respaldo".
  document.getElementById('backup-export').addEventListener('click', () => {
    exportBackup();
    onExported();
  });

  // Importar: elegir archivo, validar y pedir confirmación antes de reemplazar
  // todos los datos (no se puede deshacer).
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
}
