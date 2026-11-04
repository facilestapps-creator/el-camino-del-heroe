# Recetas — procedimientos reutilizables

> **Pendiente de revisión:** el costo de ruta pasará a derivarse del largo del trazado;
> hasta entonces el costo es manual.

## Flujo "dos caminos entre dos ciudades" (2026-11-01) — receta reutilizable

Situación: entre dos ciudades hay **DOS caminos pintados** en el mapa y el viajero debe
poder **elegir** cuál tomar (ej.: Arvandill→Sandquill por bosque o por bahía). Puede
repetirse en cualquier revisión de rutas.

**Pasos:**

1. **Trazar** ambos caminos con `tools/waypoints.html` (clics sobre el mapa con zoom/pan;
   el usuario pega el JSON en el chat). **Nunca medir capturas pegadas a ojo** — llegan
   deformadas; usar la herramienta.
2. **Costos por largo**: convertir el trazado a px reales — el largo en % lleva factor
   0,859 en x por el aspecto 963×1121 y 1% de alto = 11,21 px. Luego
   `points ≈ largo_px ÷ 13,6` (**13,6 px por punto**: número canónico de P6, medido sobre
   las 9 rutas actuales: 3.827 px / 282 pts = 13,57). Proponer costos al
   usuario con `question` — **más corto = más barato**; el camino actual **conserva su
   costo** para no romper balances existentes.
3. **`world.json`**: dos entradas en `routes` entre el **mismo par** de ciudades, cada una
   con `id` propio, `points` y campo **`"via"`** ("Bosque"/"Bahía") usando el texto ya
   existente `"routeVia": "por"`. Waypoints en orden **from→to**.
4. **`world.js`**:
   - `destinationsFrom`: **una fila por ruta directa** cuando hay varias entre dos
     ciudades (ordenadas de más barata a más cara); con una sola o ninguna directa →
     camino más corto multi-etapa como hoy.
   - `startTrip`: guarda la ruta elegida (campo `route` en el trip).
   - `markerPosition`: respeta `trip.route`; viajes viejos sin ruta guardada → fallback
     `shortestPath` (**retrocompatible**).
5. **`worldUI.js`**: la fila muestra "Ciudad · por \<via\> — costo" (texto `routeVia` +
   campo `via` de la ruta).
6. **`app.js`**: `onSelectDestination` pasa el **objeto destino completo** a `startTrip`
   (hace `.find` por cityId; con dos filas para la misma ciudad eso fallaría). Sigue
   siendo **2 toques** (fila → Viajar).
7. **Prueba**: ida y vuelta por **ambas** rutas en el navegador, `markerPosition` sobre
   cada trazo, costos, **consola limpia**, capturas para el usuario.
