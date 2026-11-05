// Flujo del mundo: elegir destino (cartel de 2 opciones + moneda de dragones),
// cancelar, entrar y explorar. Los handlers mutan session.worldState →
// guardan → refresh() (el orquestador de app).
import { showConfirm, hideConfirm } from './ui.js';
import { showDragonCoin } from './worldUI.js';
import {
  startTrip,
  cancelTrip,
  enterCity,
  exploreCost,
  exploreCity,
  rollDragon,
  saveWorldState,
} from './world.js';
import { textOf, fillText } from './text.js';

export function createWorldFlow({ world, session, textsBag, computeBalance, refresh }) {
  const worldTexts = world.texts ?? {};

  // Tras elegir opción (y la moneda si hay dragón), verificar el saldo.
  // Con saldo suficiente el viaje empieza directo; sin saldo, cartel que
  // ofrece empezar igual (Aceptar) o no hacer nada (Cancelar).
  function choosePlan(found, withExplore) {
    hideConfirm();
    const beginTrip = (withDragon) => {
      const travelCost = withDragon ? found.costWithDragon : found.cost;
      const finalCost = withExplore ? travelCost + exploreCost(world) : travelCost;
      const start = () => {
        startTrip(session.worldState, found.city.id, finalCost, withDragon, withExplore, found.route);
        saveWorldState(session.worldState);
        refresh();
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
      const roll = rollDragon(session.worldState, world, found.dragonEdge.id);
      // El resultado se persiste AL TIRAR: recargar no permite re-tirar.
      saveWorldState(session.worldState);
      showDragonCoin(world, roll, beginTrip);
    } else {
      beginTrip(false);
    }
  }

  // Handlers para renderWorldPanel (worldUI). Se construyen una vez: leen el
  // estado a través de session.* (mutable) y refrescan vía el orquestador.
  const panelHandlers = {
    // Elegir una ciudad abre el cartel de 2 opciones (sin Viajar suelto).
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
      cancelTrip(session.worldState);
      saveWorldState(session.worldState);
      refresh();
    },
    onEnterCity: () => {
      enterCity(session.worldState);
      saveWorldState(session.worldState);
      refresh();
    },
    onExploreCity: () => {
      exploreCity(world, session.worldState, computeBalance());
      saveWorldState(session.worldState);
      refresh();
    },
  };

  return { panelHandlers };
}
