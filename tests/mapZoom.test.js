// Pieza 1 — Zoom del mapa: límites, clamp del desplazamiento y compensación
// del marcador (lógica pura; los gestos se verifican en el navegador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_ZOOM, MAX_ZOOM, clampZoom, clampPan, markerScale } from '../js/mapZoom.js';

test('el zoom queda entre 1x y 2,5x', () => {
  assert.equal(clampZoom(0.4), MIN_ZOOM);
  assert.equal(clampZoom(1.7), 1.7);
  assert.equal(clampZoom(9), MAX_ZOOM);
  assert.equal(clampZoom(NaN), MIN_ZOOM);
});

test('a 1x no hay desplazamiento', () => {
  assert.deepEqual(clampPan({ x: 40, y: -20 }, 1, { width: 100, height: 200 }), { x: 0, y: 0 });
});

test('el pan no deja salir el mapa de sus bordes', () => {
  // transform-origin al centro: el excedente se reparte entre ambos lados.
  assert.deepEqual(
    clampPan({ x: 200, y: -200 }, 2, { width: 300, height: 200 }),
    { x: 150, y: -100 },
  );
  assert.deepEqual(
    clampPan({ x: -200, y: 200 }, 2, { width: 300, height: 200 }),
    { x: -150, y: 100 },
  );
});

test('el marcador compensa con la escala inversa', () => {
  assert.equal(markerScale(1), 1);
  assert.equal(markerScale(2), 0.5);
  assert.equal(markerScale(2.5), 0.4);
});
