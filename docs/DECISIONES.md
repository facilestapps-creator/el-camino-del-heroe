# Decisiones de diseño — "El camino del héroe"

Registro de las decisiones tomadas. Si algo cambia, se actualiza acá.
Última actualización: 2026-11-04.

---

## 🗺️ Mundo / Mapa

- **Mapa original**: `Fantasy World Tutorial Map` — 2048×1536 px. **No está en el repo**
  (nunca se subió) ni en `assets/map/`; quedan copias `.jpg` en `~/Descargas/` de la
  máquina del usuario (verificado 2026-11-04). **No borrar los originales.**
- **Imagen intermedia** `world-map.webp` (1600×1200, **79.6 KB**, creada con PIL): ya no
  está en el proyecto — solo quedó el recorte (a continuación).
- **Recorte a la isla (Bloque C ✓)**: `assets/map/world-map-crop.webp` — **963×1121, ~110 KB**.
  Es la imagen que ahora referencia `world.json` (`"image"`).
- **Ciudad inicial**: **Arvandill** (centro). Desde ahí el personaje se mueve libremente.
- **Nombre correcto**: **Dar'Hanok** (no "Dun Hanok").
- **6 ciudades** con coordenadas sobre el recorte `world-map-crop.webp` (963×1121, % de la
  imagen) — transformadas desde las originales con la fórmula del Bloque C
  (`nuevo% = (viejo% × tamaño_original − inicio_recorte) / tamaño_recorte × 100`):

  | Ciudad | X% | Y% |
  |---|---|---|
  | Western Glades | 17.7% | 63.0% |
  | Dar'Hanok | 44.5% | 29.1% |
  | Vornstead | 69.4% | 45.7% |
  | **Arvandill** (inicio) | 59.4% | 54.4% |
  | Sandquill | 78.5% | 66.7% |
  | Starkrock | 67.2% | 83.0% |

  (Originales sobre 2048×1536, por si se necesita re-calcular: WG 13.3/53.0 ·
  DH 25.9/28.3 · Vornstead 37.6/40.4 · Arvandill 32.9/46.7 · Sandquill 41.9/55.7 ·
  Starkrock 36.6/67.6.)

## 🛤️ Grafo de caminos (elegido: Opción B — grafo con camino más corto)

Regla: **10 px del mapa = 1 punto de viaje base**. Montaña ×1.3 · bosque ×1.1.
Los costos de abajo son **base**; en uso se multiplican por `travelCostMultiplier` (Bloque A).

| # | Tramo | Costo base | Notas |
|---|---|---|---|
| 1 | Western Glades ↔ Arvandill | 41 pts | Costero, por Serpent Bay |
| 3 | Dar'Hanok ↔ Arvandill | 41 pts | The Great Mountain Pass (×1.3) |
| 4 | Dar'Hanok ↔ Vornstead | 33 pts | Ruta norte (×1.1) |
| 5 | Arvandill ↔ Vornstead | 14 pts | Corta |
| 6 | Arvandill ↔ Sandquill | 23 pts | Llanura |
| 7 | Arvandill ↔ Starkrock | 33 pts | The Golden Plateau |
| 8 | Sandquill ↔ Starkrock | 21 pts | Costa sureste |
| 9 | Western Glades ↔ Starkrock | 53 pts | **Cruza Serpent Bay — aventura de dragones** |
| 10 | Vornstead ↔ Sandquill | 25 pts | Costa de Vorn Bay (confirmado con imagen) |

- ❌ **No hay camino directo** Western Glades ↔ Dar'Hanok (tramo original #2 descartado).

### 🐉 Mini aventura aleatoria (tramo 9 — Serpent Bay)

- Probabilidad de dragón: **0.3** (fijada en el Bloque A; era 0.5).
- Si salen dragones → el tramo cuesta el doble, calculado **sobre el costo ya multiplicado**
  por `travelCostMultiplier` (base 53 → 212 con ×4 → **424** si hay dragón).
- **UI teatral**: **moneda al aire en CSS** (giro 3D cara 🐉 / cruz 🍀, resuelve en 1.4 s,
  cartel con el resultado). Decisión del usuario 2026-10-30: **sin asset externo**, todo
  en CSS. Se lanza **solo si el camino elegido pasa por el tramo con `dragonRisk`** (en la
  práctica: desde Western Glades hacia Starkrock). Implementado en Fase 2 (M5).

## 🚶 Acciones por ciudad (3 acciones distintas)

1. **Viajar** — consume puntos acumulados; modelo **progresivo automático** (decisión del
   usuario 2026-10-30, estilo Zombie Hikers): elegido el destino, **todo el saldo
   disponible fluye solo** hacia el viaje hasta completar el costo. Gastos en `spent`.
   El destino se elige por **camino más corto** (Dijkstra, Opción B) y su costo real
   (×4). Panel muestra **"Faltan X"** y **"Cancelar viaje"** (devuelve lo invertido).
2. **Entrar** — confirma la llegada: la ubicación pasa a ser la ciudad destino
   (se agrega a `visited`).
3. **Explorar** — costo fijo **10 pts** (en uso: 10 × `travelCostMultiplier` = **40**).
   Marca la ciudad como "Explorada". Contenido de exploración: fase posterior.

## ⭐ Puntos

- Hábitos con valores fijos: **mín 1 / completo 3**.
- **Pasos**: cada **700 pasos = 1 pt** — `stepsPerPoint: 700` guardado en `habits.json`.
  - **Carga manual** del usuario (único usuario por ahora). Si algún día se abre al
    público, esta mecánica habría que re-worklear (la web no lee el podómetro).
  - **Implementado (auditoría M3)**: campo numérico enteros ≥ 0 con el **TOTAL** del día,
    `points = floor(pasos / 700)`, acumulativo; ver "🔍 Auditoría M1–M7".
  - **Regla de pasos (Ajuste 1, 2026-11-03 → 04)**: la carga es **acumulativa y siempre
    editable** (el campo NUNCA se bloquea ni se marca como enviado). Validación en la
    capa de lógica (`validateSteps` en `habits.js`, que también usa `saveSteps`):
    - **Mínimo = lo ya enviado** (`sentPoints × stepsPerPoint`) — lo enviado no se puede
      bajar. Campo vacío o no numérico = 0 y aplica la misma regla.
    - **Tope = `maxSteps: 30000`** (en `habits.json`, junto a `stepsPerPoint`).
    - Ante un valor rechazado: no se guarda, el campo vuelve al último valor guardado y
      se muestra un mensaje debajo (`stepsMinMessage` / `stepsMaxMessage` en
      `texts.json`, armados con `fillText`); el mensaje desaparece en el siguiente
      cambio válido. Los hábitos **por niveles** siguen bloqueándose tras Enviar.
- **Sin techo diario** de puntos (decidido ✓).
- **Saldo disponible** = Σ puntos ganados en **todos los días** − puntos gastados.
  Los gastados viven en `habitQuest:world:v1` campo **`spent`** (default 0).
  Se muestra en pantalla con `texts.balanceLabel`.

## 🎛️ Interacción con los hábitos (2026-10-29 — aprobada por el usuario)

- **Cada hábito tiene dos botones directos**: `[Mínimo]` `[Completo]` uno al lado del
  otro, y **cada botón lleva su descripción debajo** (`minDesc` bajo Mínimo,
  `fullDesc` bajo Completo). Sin descripciones a la izquierda (esto reubica las
  descripciones del Bloque A: siguen siempre visibles, ahora bajo cada botón).
- **Selección única** (tipo radio): solo un estado marcado por hábito.
  - Tocar un botón lo marca (1 toque).
  - Tocar **el botón activo lo desmarca** (vuelve a "sin marcar").
  - Tocar **el otro** botón cambia directo (de Completo a Mínimo sin pasar por 0).
- **Colores**: azul = sin elegir/disponible · verde = Mínimo · amarillo = Completo.
- **Origen**: experimento solo en "Pasos" (pedido del usuario), aprobado → extendido a
  los 7 hábitos el mismo día.
- **Mecanismo**: flag `"style": "direct"` en cada hábito de `habits.json` (data-driven);
  los botones llevan `data-level` (1 o 2) y el clic alterna/desmarca según nivel actual.
- El diseño anterior (1 botón ciclico Empezar → Minimo → Completo) quedó **sin uso**:
  código conservado como fallback, ver limpieza en "Pendientes".

## 📦 Persistencia

- Hábitos y días: `habitQuest:data:v1`.
  - Guardado por hábito: `days["YYYY-MM-DD"][habitId] = { level, points }` con los puntos
    calculados **al momento de guardar** con habits.json de ese momento (**SCHEMA_VERSION = 2**,
    con migración desde el formato viejo numérico — Bloque A).
- Mundo: `habitQuest:world:v1` — ampliado en la Fase 2 (M1): **`spent`** (default 0),
  **`currentCity`** (ubicación actual, arranca en `startCity`), **`visited`** (ciudades
  visitadas), **`explored`** (ciudades exploradas) y **`trip`** (viaje en curso:
  destino, costo, progreso y flag de dragón; `null` si no hay viaje).

## ⚙️ Bloques de ajuste (decididos — antes de la Fase 2)

### Bloque A — Datos y lógica  ✓ (implementado y probado el 2026-10-29)

1. `world.json`: **`travelCostMultiplier": 4`** — aplica al costo de cada camino **y** a
   `explorationCost`; el doble por dragones se calcula sobre el costo ya multiplicado.
   **`dragonProbability": 0.3`** (era 0.5). La lógica de viaje no existe aún → dejar solo
   los valores en el JSON y documentarlos.
2. Guardado diario: `days["YYYY-MM-DD"][habitId] = { level, points }` (puntos al guardar
   con habits.json de ese momento). **SCHEMA_VERSION 1 → 2** + migración: valor número
   (formato viejo, solo nivel) → `{ level, points }` con habits.json actual.
   **Los datos ya guardados no se pueden perder.**
3. **Saldo disponible** = suma de todos los puntos ganados en todos los días − gastados
   (`spent` en `world:v1`, default 0). Mostrar con `texts.balanceLabel`.
4. **Bug de medianoche**: al volver a visible (`visibilitychange`), recalcular la fecha de
   hoy y recargar los niveles del día actual.
5. Cada hábito muestra **`minDesc` y `fullDesc` a la vez, siempre visibles**.

### Bloque B — Respaldo  ✓ (implementado y probado 2026-10-30)

1. Botón **Exportar**: descarga `habit-quest-backup-YYYY-MM-DD.json` con TODAS las claves
   de `localStorage` que empiecen con `habitQuest:` (así el mundo y lo que se agregue
   después queda incluido sin tocar el código) + fecha de exportación + versión del esquema.
2. Botón **Importar**: selector de archivo, validar que sea un respaldo válido, pedir
   confirmación explícita (reemplaza todos los datos actuales) y recargar.
3. Textos en `texts.json`. Ambos botones al final de la pantalla.

**Decisiones tomadas durante la implementación:**

- Estructura del archivo: `{ exportedAt (ISO), schemaVersion, data: { clave habitQuest: → valor } }`.
  Prefijo del nombre en `config.js` (`BACKUP_FILE_PREFIX`); lógica en el módulo `js/backup.js`.
- Validación de "respaldo válido": JSON legible + `exportedAt` string + `schemaVersion` number +
  `data` objeto con **al menos una clave `habitQuest:`**. Si no pasa → `importInvalidMessage`
  en rojo bajo los botones y **no se tocan los datos**.
- Confirmación: **cartel propio de la app** (elegido por el usuario en vez del diálogo nativo),
  con textos nuevos `confirmAcceptLabel` ("Aceptar") / `confirmCancelLabel` ("Cancelar") /
  `importConfirmMessage` (ya aprobado).
- Al aceptar: se borran TODAS las claves `habitQuest:` actuales, se escriben las del respaldo
  (valores no-string se re-serializan) y se recarga; datos de esquemas viejos se migran en la
  carga normal. Al cancelar: se cierra el cartel y nada cambia.

### Bloque C — Recorte de mapa  ✓ (implementado y probado 2026-10-30)

1. Recortar la imagen a la isla desde el original más grande
   (`assets/map/Fantasy World Tutorial Map.webp`, 2048×1536). Recorte aproximado:
   **de 5% a 52% del ancho y de 7% a 80% del alto**. Guardar como
   `assets/map/world-map-crop.webp`, calidad ~80. **No borrar ni pisar ningún archivo existente.**
2. Recalcular x e y de las 6 ciudades en `world.json` para el recorte:
   `nuevo% = (viejo% × tamaño_original − inicio_recorte) / tamaño_recorte × 100` (por eje).
   Cambiar `"image"` en `world.json` a la imagen nueva.
3. Verificar dibujando un círculo sobre cada ciudad en la imagen recortada y confirmando
   que coincide con los carteles del mapa. Reportar el peso de la imagen resultante.

**Implementado (2026-10-30):**

- Caja de recorte usada: **(102, 108) → (1065, 1229)** = **963×1121 px**; peso final
  **112.530 bytes (~110 KB)**, calidad 80. Originales y `world-map.webp` intactos en ese
  momento (hoy `assets/map/` solo tiene el recorte — ver «Mundo / Mapa»).
- Coordenadas nuevas ya aplicadas en `world.json` (ver tabla en "🗺️ Mundo / Mapa");
  `"image"` → `assets/map/world-map-crop.webp`. Rutas, textos y costos sin cambios.
- Verificación visual: 6 círculos rojos → **todos sobre su ciudad** (edificios + cartel).
  La imagen de prueba quedó en `/tmp`, nunca en el proyecto.

## 🔍 Auditoría M1–M7 (2026-10-30 → 2026-10-31)

Revisión general del código + mejoras aprobadas por el usuario en la tanda
M1–M7 (specs de cada mini-bloque en esta sección):

### M1 — Limpieza

- Imports sin uso borrados; `computeBalance` usa **`worldState.spent`** como fuente
  única de verdad (`loadWorldSpent` eliminada de storage.js); `saveTodayLevel` **ya no
  muta** `daysData` (devuelve el objeto nuevo y quien llama reasigna).
- **`js/text.js` (nuevo)**: helper `textOf(bag, key)` → si falta la clave se muestra
  **vacío + `console.warn`** con el nombre de la clave (nunca un string hardcodeado).
- Textos fuera del código: `'Hoy'`, `'Puntos de hoy'` → texts.json; `'Aceptar'` (dragón)
  → `world.texts.dragonAccept` en world.json.

### M2 — Dragones sin re-tiradas

- **`dragonRolls: { "<edgeId>": true|false }`** en `world:v1` (default `{}` en
  `freshState` **y** en `loadWorldState` campo por campo). El resultado se **persiste al
  tirar**, no al aceptar el viaje.
- Si ya hay resultado guardado para el tramo → se muestra el **mismo** resultado con el
  mismo cartel **sin animación**. Se **borra `dragonRolls` al Entrar** (una ciudad nueva
  = nueva aventura).

### M3 — Enviar + pasos manuales (SCHEMA_VERSION 3)

- Modelo por hábito: **`{ level, points, sentPoints }`**. **Pendientes** = `points −
  sentPoints` (no se recalculan). **Disponible** = Σ `sentPoints` − `worldState.spent`
  (los pendientes NO suman ni fluyen).
- Botón **Enviar** bajo la lista solo con pendientes (deshabilitado si = 0; varias veces
  por día). Hábito con `sentPoints > 0` → **bloqueado**: ambos botones deshabilitados +
  marca "Enviado" (`habitLocked`); sin subir de Mínimo a Completo ni desmarcar.
- **Migración v1/v2 → v3**: todo pasa a `sentPoints = points` → el saldo NO cambia.
- **Pasos**: `style: "number"` en habits.json (sin minDesc/fullDesc ni puntos fijos);
  campo numérico enteros ≥ 0 con el TOTAL del día; `points = floor(pasos / 700)`,
  acumulativo (Enviar suma solo la diferencia); regla "700 pasos = 1 punto" desde
  texts.json. Migración de pasos: nivel 1/2 → `{ steps: 2500|5000, points: <guardados> }`.

### M4 — Sin saldo + cartel de 2 opciones

- **Modal genérico**: el cartel de confirmación del respaldo se generalizó a
  **`showConfirm(message, buttons)`** / `hideConfirm()` (botones `[{label, className,
  onClick}]`, textos desde data) — un solo `#confirm-overlay` en index.html para
  respaldo, viajes, dragones, etc.
- **"Entrar" es gratis** y habilita Explorar. Elegir destino abre cartel con
  **"Viajar a X"** / **"Viajar, entrar y explorar X"** (+ Cancelar). El plan full paga
  los 40 de explorar **dentro del costo del viaje** y `settleArrival` lo registra al llegar.
- Viaje con saldo insuficiente: tras la moneda (si hay dragón) → cartel `notEnoughTravel`
  ("Tenés X, te faltan Y… ¿empezar el camino igual?"); Aceptar inicia el viaje con el
  costo final (+40 si plan full), Cancelar no pasa nada (la moneda ya está guardada).
- **Explorar nunca parcial**: deshabilitado con `notEnoughExplore`. Llegar
  (`settleArrival`) mueve el marcador proporcional y deja a `currentCity` en el destino;
  la ciudad llegada se muestra con "Llegaste a X" + Entrar + bloque de ciudad (con
  Explorar) **antes** de la lista de destinos, también tras recargar.

### M5 — Historias por ciudad

- **`data/stories.json`**: `{ "stories": { idCiudad: texto } }`. Placeholder
  "Historia pendiente: {name}" (el nombre se completa desde `world.json` con `fillText`,
  sin duplicar texto). Se muestra bajo la etiqueta "Explorada"; si falta la historia de
  una ciudad → `console.warn` y no se muestra nada.

### M6 — Respaldo validado + "Último respaldo"

- **Validación antes de aplicar** (además de la del Bloque B): si el archivo trae
  `data:v1` → `days` con entradas de los esquemas 1/2/3 (`level`/`points`/`sentPoints`/
  `steps` numéricos si están); si trae `world:v1` → `spent` number, `currentCity` string,
  `visited`/`explored` arrays. No cumple → `importInvalidMessage` **sin tocar datos**.
- **`habitQuest:meta:v1`** con `{ lastBackupAt }` (ISO): se escribe **ANTES** de armar el
  archivo → queda dentro del propio respaldo. Umbral `BACKUP_STALE_DAYS = 7` en
  `config.js`. Textos: `lastBackupDays` ("Último respaldo: hace {days} días"),
  `lastBackupOneDay`, `lastBackupToday`, `lastBackupNever`; resaltado ámbar si nunca o
  ≥ 7 días.

### M7 — Docs

- README (estructura con `stories.json`), ROADMAP (auditoría + pendientes: publicar
  online, app instalable, historial, hitos, perseguidor) y este archivo.

## 🧭 Waypoints en rutas + herramienta de trazado (2026-10-31 → 2026-11-01)

- **Las rutas ahora se dibujan sobre los caminos pintados del mapa**: cada ruta en
  `world.json` puede llevar **`waypoints: [{x,y}]`** (% sobre `world-map-crop.webp`,
  963×1121) en orden **from→to**. Sin waypoints = recta (**retrocompatible**).
- **Interpolación por longitud** (`js/world.js`): el marcador avanza a lo largo del
  trazado proporcional a la longitud real de cada tramo (`pointAlongRoute`,
  `routeSegmentLength` con factor **0,859** en x por el aspecto de la imagen);
  `edgeWaypointsOrdered` solo invierte el orden si el viaje va en sentido contrario.
- **Las 9 rutas** quedaron trazadas (3–16 px del camino pintado detectado); costos sin
  cambios. `arv-stark` (53 pts, 53 waypoints) probada a full: desvío máx 0,05 %,
  marcador sobre el trazo, vuelta en espejo, consola limpia.
- **`tools/waypoints.html`** (aprobada por el usuario): herramienta de trazado — clics
  sobre el mapa, zoom (rueda) + pan, grilla 5 px, deshacer y **📋 Copiar JSON** para
  pegarlo en el chat. **Nunca medir capturas pegadas a ojo** (llegan deformadas).
- **`arv-sand` es DOS rutas** (IMPLEMENTADO 2026-11-03): `arv-sand` por **Bosque**
  (23 pts, conserva su trazo y costo) y `arv-sand-bay` por **Bahía** (19 pts, más
  corta → más barata; 23 wp sobre la costa de Vorn Bay, coste fórmula `L × 0,0729` =
  19.0). Cada ruta lleva campo **`"via"`** ("Bosque"/"Bahía") que se muestra con el
  texto existente `routeVia` ("por").
- **Mini-bloque "dos caminos"** (aprobado, IMPLEMENTADO 2026-11-03, receta en
  `docs/RECETAS.md`): `destinationsFrom` → **una fila por ruta directa** (más barata
  primero, campo `route`); `startTrip` guarda `trip.route`; `markerPosition` la respeta
  (fallback `shortestPath` para viajes viejos); `worldUI.js` muestra "Ciudad · por X";
  `app.js` pasa el **objeto destino completo** (un `.find` por cityId fallaría con dos
  filas). Sigue siendo **2 toques** (fila → Viajar). Probado: marcador 0.000% sobre el
  trazo elegido en ida y vuelta, consola limpia.
- **5 rutas con waypoints reemplazados** por los trazos aprobados del usuario, costos
  sin cambio: arv-vorn (19 wp), dh-vorn (50, invertido a orden from→to), arv-dh (60),
  arv-wg (50), wg-stark-bay (71). Verificados con overlays PIL + crops de zoom.
- **Ajustes (2026-11-03, pedido del usuario)**: `sand-stark` **ELIMINADA** (el usuario
  confirmó que esa ruta no existía) → **9 rutas finales** y **Sandquill↔Starkrock pasa a
  multi-etapa** (7º par sin ruta directa, resuelto por Arvandill: 52 pts). `vorn-sand`
  **re-trazada** con los **25 waypoints** que entregó el usuario (antes 7, "fuera del
  camino"): verificado sin saltos (segmento máx < 1 %), extremos en Vornstead/Sandquill.
  Costos sin cambio. Mapa de referencia con un color por ruta:
  `/tmp/opencode/rutas-finales.png` (script `rutas_colores.py`, no toca `assets/map/`).
- **Costos por largo**: `points ≈ largo_px × 0,079` (k promedio); proponer al usuario
  antes de escribirlos.
- **Revisión de rutas (solo lectura)**: las 9 rutas siguen caminos pintados; **6 pares
  sin ruta directa DESCARTADOS definitivamente** (WG↔DH, WG↔Vorn, WG↔Sand, DH↔Sand,
  DH↔Stark, Vorn↔Stark — los resuelve el multi-etapa). No hay más pares con DOS caminos
  pintados: el mini-bloque fue solo el par Arvandill↔Sandquill.

## 🌐 Publicación (2026-11-03 — elegida: GitHub Pages)

- **Hosting: GitHub Pages** sobre el repo público
  `github.com/facilestapps-creator/el-camino-del-heroe` (elegido por el usuario que ya
  tenía cuenta de GitHub; Cloudflare también estaba disponible). URL en vivo:
  `https://facilestapps-creator.github.io/el-camino-del-heroe/`.
- **Acceso desde el agente: clave SSH** (`ssh-keygen -t ed25519` en la máquina del
  usuario, pública agregada una sola vez en github.com). Alternativa "subida por
  navegador" descartada: con SSH el agente publica futuros cambios solo (un
  `git push` y GitHub Pages redespliega solo).
- **git**: repo local inicializado 2026-11-03 (rama `main`, commit de estado inicial).
  Publicar = `git add -A && git commit && git push`.
- **Repo público** (requerido por Pages gratis): el código es visible, **los datos de
  hábitos no** — viven en el localStorage de cada navegador y nunca se suben.
- App 100 % estática (HTML/CSS/JS + `data/` + `assets/`): sirve cualquier hosting
  estático; los ES modules funcionan porque el servidor envía `.js` con MIME correcto
  (verificado en vivo: 200 + MIME OK en todos los assets).

## 📲 App instalable (2026-11-03 — decidido con el usuario)

- **Ícono: recorte del mapa** (el usuario eligió entre pasar una imagen / mapa / uno
  generado): cuadrado 963×963 centrado en la isla de `world-map-crop.webp` →
  `assets/icons/` (192, 512, **maskable** al 78 % sobre `#0f172a`, apple-touch 180).
- **Sin offline** (el usuario eligió "solo instalable"): **no hay service worker**. La
  instalación no lo pide desde Chrome 108 (Android) / 112 (desktop) — verificado en la
  doc de Chrome; el navegador del agente (Electron) ni dispara `beforeinstallprompt`
  (limitación del entorno, no un fallo).
- **`data/manifest.json`** vive en `data/` para respetar "todo texto viene de data/"
  (name/short_name son texto): `start_url` y `scope` con `"../"` (se resuelven contra la
  URL del manifest). Theme/background `#0f172a` (color de fondo del CSS).
- En `index.html` solo links/ metas (manifest, icon, apple-touch-icon, theme-color) —
  sin texto hardcodeado.

## 📋 Revisión 2026-11-03 (auditoría del usuario → plan P1–P6)

- **Costo de ruta derivado del largo dibujado**: **13,6 px por punto**, sin valor
  manual (reemplaza los costos fijos de la tabla del grafo; ver RECETAS — pendiente de
  implementación, nota de revisión).
- **Refactor antes de seguir con funciones nuevas** (P5: almacenamiento/capas, dividir
  `app.js`, código muerto, textos con variables).
- **Pruebas con `node --test`** (Node 18+) en `tests/` (P4) — **implementado
  2026-11-04**: `npm test` (equivale a `node --test tests/`), 34 pruebas de lógica
  (habits, world, backup, datos) con `node:test` + `node:assert/strict`, cero
  dependencias y localStorage falso en `tests/helpers/localStorage.js`.
  **Las pruebas se corren antes de cada push de código**: si fallan, no se pushea.
- **Tope de pasos: 30.000** (`maxSteps` en `habits.json`) — **implementado** en el
  Ajuste 1 (2026-11-03 → 04, ver "⭐ Puntos").
- **Hosting: GitHub Pages** — por eso la app **no se separa en `app/`** (Pages sirve
  desde la raíz de la rama).
- **`docs/overview.md` es la memoria única del proyecto** (estado, problemas, plan,
  historial) — reemplazó a `docs/MEMORIA.md`.

## 🙋 Dudas resueltas con el usuario (NO re-preguntar)

- **"Entrar" es GRATIS** (no tiene costo — el usuario se corrigió solo). Habilita
  **Explorar** (solo se explora una ciudad después de haber entrado en ella).
- **Cartel al elegir destino = 2 opciones**: **"Viajar a X"** (solo costo de distancia) ·
  **"Viajar, entrar y explorar X"** (distancia + 40 de explorar ya sumados; al llegar
  queda entrada + explorada). Aprobado por el usuario ("¿te parece mejor?" → sí).
- **Llegada (viaje al 100%)**: el marcador se mueve **proporcional del camino** durante
  el viaje (si solo alcanza para un tramo intermedio, queda en ese punto) y al completarse
  **queda en la ciudad destino** (pasás a estar ahí; libre de seguir viajando sin entrar).
  "Entrar" solo registra la ciudad (visited) y habilita Explorar.
- **Botón "Explorar"**: en el bloque de ciudad **bajo "Llegaste a X"** (junto a Entrar),
  no abajo de la página. Mi interpretación: visible también tras recargar (si estás en
  ciudad entrada y sin explorar); si el usuario lo quiere SOLO en el instante de la
  llegada, avisará.
- **Pasos**: los puntos **no pueden bajar de lo ya enviado** → points =
  max(sentPoints, floor(pasos / 700)).
- **M4 (sin saldo)**: cartel con variables (texto en world.json) por opción
  (Viajar vs Viajar+entrar+explorar).
- Dragones: persistir al **tirar** (no al aceptar), reusar guardado sin animación,
  borrar dragonRolls al **Entrar** — todo confirmado "si" por el usuario.

## ⏳ Pendientes / diferidos

- **journey.json (15 hitos)** — diferido: el viaje ya funciona (Fase 2 ✓). Los hitos se
  retoman en su momento (ROADMAP: después de Historial y App instalable).
- ~~Crear la imagen/animación de la **moneda al aire**~~ — **hecho** (Fase 2 M5): moneda
  en CSS, sin asset externo.
- ~~Detalle de taps/UI de las 3 acciones~~ — **hecho** (Fase 2 M2–M5): vista "Hoy" ↔
  "El camino", panel de destino con costo, Viajar/Cancelar/llegada, Entrar y Explorar.
- ~~UI de carga manual de pasos (regla 700 = 1 pt)~~ — **hecha**: campo en "Hoy", siempre
  editable y validado (mínimo = lo ya enviado, tope 30.000) desde P1.
- **Limpieza de código para más adelante**: ~~imports sin uso en `app.js`~~ y
  ~~`saveTodayLevel` modifica `daysData` por referencia~~ — **resuelto en auditoría M1**;
  ~~estilo cíclico sin uso~~ — **eliminado en P5c** (botón único Empezar/Minimo/Completo
  reemplazado por los botones directos el 2026-10-29; ya no hay fallback: `data.test.js`
  exige `style ∈ {direct, number}`) junto con los textos huérfanos `habitStart`
  ("Empezar"), `tagline` y `welcome` de texts.json.
- **Los nombres de las ciudades están dibujados en la imagen del mapa y son definitivos.**
