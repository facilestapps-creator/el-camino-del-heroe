// Pieza 1 — Zoom del mapa. El zoom vive acá, fuera de refresh(): renderWorldMap
// solo dibuja la imagen y el marcador, así un refresh no altera el acercamiento.
// El marcador lleva scale(1/zoom): su centro sigue en el left/top en % (sigue
// alineado) y solo se compensa su tamaño visual.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.5;

export function clampZoom(value) {
  if (!Number.isFinite(value)) {
    return MIN_ZOOM;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

// Escala inversa para que el marcador mida lo mismo en pantalla a cualquier zoom.
export function markerScale(zoom) {
  return 1 / clampZoom(zoom);
}

// Con transform-origin en el centro, el desborde de cada lado es la mitad del
// excedente. A 1x no puede haber desplazamiento.
export function clampPan(pan, zoom, size) {
  if (zoom <= MIN_ZOOM) {
    return { x: 0, y: 0 };
  }
  const maxX = Math.max(0, (size.width * (zoom - 1)) / 2);
  const maxY = Math.max(0, (size.height * (zoom - 1)) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

export function setupMapZoom() {
  const wrap = document.querySelector('.map-wrap');
  const layer = document.getElementById('map-zoom');
  const marker = document.getElementById('map-marker');
  if (!wrap || !layer) {
    return;
  }

  let zoom = MIN_ZOOM;
  let pan = { x: 0, y: 0 };
  const pointers = new Map();
  let gesture = null;
  let lastTapAt = 0;

  function apply() {
    pan = clampPan(pan, zoom, { width: wrap.clientWidth, height: wrap.clientHeight });
    layer.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    // A 1x la página sigue scrolleando sobre el mapa; agrandado, el dedo mueve el mapa.
    wrap.style.touchAction = zoom > MIN_ZOOM ? 'none' : 'pan-y';
    if (marker) {
      marker.style.transform = `translate(-50%, -50%) scale(${markerScale(zoom)})`;
    }
  }

  function pointOf(event) {
    const rect = wrap.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function center() {
    return { x: wrap.clientWidth / 2, y: wrap.clientHeight / 2 };
  }

  function pinchData() {
    const [a, b] = [...pointers.values()];
    return {
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.hypot(b.x - a.x, b.y - a.y),
    };
  }

  function beginGesture() {
    if (pointers.size === 1) {
      gesture = { mode: 'pan', start: [...pointers.values()][0], pan: { ...pan }, moved: 0 };
    } else if (pointers.size >= 2) {
      const { mid, distance } = pinchData();
      const c = center();
      gesture = {
        mode: 'pinch',
        zoom0: zoom,
        pan0: { ...pan },
        mid0: { x: mid.x - c.x, y: mid.y - c.y },
        distance0: distance || 1,
      };
      lastTapAt = 0;
    }
  }

  wrap.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    pointers.set(event.pointerId, pointOf(event));
    wrap.setPointerCapture(event.pointerId);
    beginGesture();
  });

  wrap.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gesture) {
      return;
    }
    pointers.set(event.pointerId, pointOf(event));
    if (gesture.mode === 'pan') {
      const point = pointOf(event);
      const dx = point.x - gesture.start.x;
      const dy = point.y - gesture.start.y;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
      if (zoom > MIN_ZOOM) {
        pan = { x: gesture.pan.x + dx, y: gesture.pan.y + dy };
        apply();
      }
      return;
    }
    const { mid, distance } = pinchData();
    const c = center();
    const nextZoom = clampZoom(gesture.zoom0 * (distance / gesture.distance0));
    const ratio = nextZoom / gesture.zoom0;
    // Ancla bajo los dedos el punto que había al empezar el pellizco.
    pan = {
      x: mid.x - c.x - ratio * (gesture.mid0.x - gesture.pan0.x),
      y: mid.y - c.y - ratio * (gesture.mid0.y - gesture.pan0.y),
    };
    zoom = nextZoom;
    apply();
  });

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const tap = gesture?.mode === 'pan' && gesture.moved < 10 && zoom > MIN_ZOOM;
    pointers.delete(event.pointerId);
    if (wrap.hasPointerCapture(event.pointerId)) {
      wrap.releasePointerCapture(event.pointerId);
    }
    if (pointers.size > 0) {
      beginGesture();
      return;
    }
    gesture = null;
    if (!tap) {
      return;
    }
    const now = Date.now();
    if (now - lastTapAt < 320) {
      zoom = MIN_ZOOM;
      pan = { x: 0, y: 0 };
      lastTapAt = 0;
    } else {
      lastTapAt = now;
    }
    apply();
  }

  wrap.addEventListener('pointerup', endPointer);
  wrap.addEventListener('pointercancel', endPointer);
  window.addEventListener('resize', apply);
  apply();
}
