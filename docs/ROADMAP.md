# Roadmap - El camino del héroe

Orden de trabajo. Actualizar después de cada bloque/fase.
Las specs de cada bloque están en `docs/DECISIONES.md`.

## Completadas

### Fase 0 ✓

Estructura completa de carpetas, placeholders, README con comando de servidor, página
que carga `texts.json` sin errores en consola.

### Fase 1 ✓

Pantalla única: lista de hábitos de hoy, 3 estados en 2 toques máximo, guardado
inmediato, puntos del día visibles, persistencia al recargar, diseño mobile-first.
(2 bugs corregidos: import de `saveDays`, `cache: 'no-store'` en los fetch.)

### Bloque A ✓ (2026-10-29)

Datos y lógica: `travelCostMultiplier: 4` + `dragonProbability: 0.3` en world.json,
guardado por hábito `{ level, points }` con **SCHEMA_VERSION 2** y migración automática
desde el formato viejo (números), saldo disponible = Σ ganados − `spent` (con
`balanceLabel`), fix de medianoche con `visibilitychange`, minDesc + fullDesc siempre
visibles, hábito "pasos" restaurado (interino, 1/3 pts).
**Probado en navegador**: 7 hábitos con doble descripción; tap → `{level, points}`
persistido; migración v1→v2 correcta (ej. ejercicio 2→3 pts); saldo 12 con `spent: 3` → 9;
`visibilitychange` recarga niveles y saldo; consola sin errores; estado limpio tras
borrar storage.

### Bloque B — Respaldo ✓ (2026-10-30)

Ejecutado en **4 mini-bloques con OK del usuario** entre cada uno: ① UI (botones +
textos) → ② Exportar → ③ Importar: elegir + validar → ④ Importar: confirmar + aplicar.
Botones al final de la pantalla. Exportar descarga `habit-quest-backup-AAAA-MM-DD.json`
con todas las claves `habitQuest:` + fecha + versión. Importar valida, muestra cartel de
confirmación propio de la app (decisión del usuario) y aplica con recarga.
**Probado**: descarga con contenido verificado (multi-clave), txt basura y JSON inválido
rechazados sin tocar datos, Cancelar intacto (byte a byte), Aceptar reemplaza + recarga +
refleja los datos importados, consola limpia.

### Interacción de hábitos ✓ (2026-10-29, pedido del usuario)

Diseño nuevo aprobado: **dos botones directos** por hábito (Mínimo/Completo) con la
descripción bajo cada uno, selección única, tocar el activo desmarca. Experimento
inicial solo en "Pasos" → extendido a los 7 hábitos (`"style": "direct"` en habits.json).
Ver `docs/DECISIONES.md` (sección "Interacción con los hábitos").

### Bloque C — Recorte de mapa ✓ (2026-10-30)

Ejecutado en **3 mini-bloques con OK del usuario**: ① recorte del original (5–52% ancho,
7–80% alto → caja 102,108–1065,1229) → **`world-map-crop.webp` 963×1121, ~110 KB** con
originales intactos; ② 6 ciudades recalculadas con la fórmula + `"image"` actualizado en
`world.json`; ③ verificación visual con círculos → **los 6 caen sobre su ciudad**.
Imagen de verificación guardada en `/tmp` (fuera del proyecto).

### Fase 2 — Mundo/viaje ✓ (2026-10-30)

Ejecutada con **protocolo nuevo**: mini-bloques **sin esperar OK entre ellos** (solo
frenar por dudas reales), narrando cada paso.
**M1 — Modelo** (`js/world.js`): estado `world:v1` (ubicación, visitadas, exploradas,
viaje en curso, `spent`), Dijkstra (camino más corto por costo base), costos ×4,
`flowBalanceToTrip` (viaje automático estilo Zombie Hikers, tope en el costo),
`startTrip`/`cancelTrip` (devuelve lo invertido)/`enterCity`/`exploreCity` (40).
**M2 — Pantalla**: vista conmutada **"Hoy" ↔ "El camino"** (2 botones), mapa recortado
con marcador pulsante en la ciudad actual, ubicación + saldo en vivo.
**M3 — Destino + Viajar**: panel con las 5 rutas desde la ciudad actual y su costo real
(×4); Viajar gasta el saldo → progreso con **"Faltan X"**, **Cancelar viaje** devuelve lo
invertido, al llegar muestra "Llegaste a…".
**M4 — Entrar + Explorar**: Entrar confirma la llegada (cambia ubicación real);
Explorar cuesta **40 pts** → ciudad "Explorada".
**M5 — Dragones + moneda**: tramo Serpent Bay (WG↔Starkrock) tira **moneda al aire en
CSS** (prob. 0.3) → costo **×2 sobre el costo ya ×4** (212→424) con cartel del resultado.
**M6 — Cierre**: prueba integral + **restauración de datos reales del usuario**.
**Probado**: toggle, marcador y persistencia tras recargar; flujo completo
viajar→llegar→entrar→explorar; Faltan/Cancelar; **ambos lados de la moneda**
(cara 212 / cruz 424 forzada); consola sin errores; datos del usuario restaurados
(13 pts, Arvandill, sin viaje).

### Auditoría M1–M7 ✓ (2026-10-30 → 2026-10-31)

Revisión general por mini-bloques narrados (sin esperar OK, solo frenar por dudas).
**M1 — Limpieza**: sobras fuera, textos desde `texts.json`/`world.json`, helpers.
**M2 — Dragones sin re-tiradas**: `dragonRolls` persistido al tirar, re-muestra sin
animación, se borra al Entrar.
**M3 — Enviar + pasos manuales (esquema v3)**: `{ level, points, sentPoints }`,
Disponible = Σ sentPoints − spent, hábitos enviados bloqueados, pasos numéricos
(700 pasos = 1 punto) con migración v1/v2→v3.
**M4 — Sin saldo + cartel 2 opciones**: "Viajar a X" / "Viajar, entrar y explorar X" /
Cancelar, `notEnoughTravel`/`notEnoughExplore`, llegada deja en la ciudad destino
(`settleArrival`) y Explorar en bloque de ciudad junto a "Llegaste a X".
**M5 — Textos por ciudad**: `data/stories.json` (historia por ciudad, placeholder con
`{name}`), mostrada bajo "Explorada"; si falta → `console.warn` + nada.
**M6 — Respaldo validado + "Último respaldo"**: validación de esquemas antes de aplicar
(sin tocar datos si no cumple), `habitQuest:meta:v1` con `lastBackupAt` incluido en el
propio archivo, "Último respaldo: hace N días / hoy / nunca" resaltado si nunca o ≥ 7
días (umbral en config.js).
**M7 — Docs**: README (estructura con `stories.json`), ROADMAP (esta sección +
pendientes), DECISIONES (specs de la auditoría).
**Probado en navegador**: 12 tests M4; 4 escenarios M5 (+ restauración); 8 tests M6;
consola sin errores en todos.

### Waypoints en rutas + herramienta de trazado ✓ (2026-10-31 → 2026-11-01)

- **Waypoints por ruta** (`waypoints: [{x,y}]` en `world.json`, % sobre el recorte
  963×1121): interpolación por longitud, orden from→to, **retrocompatible** (sin
  waypoints = recta). Las **9 rutas** quedaron trazadas sobre los caminos pintados.
- **`arv-stark` (53 pts)** probada a full: desvío máx 0,05 % sobre el trazo, marcador
  sobre el camino, vuelta en espejo, consola limpia.
- **`tools/waypoints.html`**: herramienta de trazado aprobada (clics, zoom/pan, grilla,
  deshacer, "📋 Copiar JSON" → el usuario lo pega en el chat).
- **Revisión de rutas (solo lectura)**: las 9 rutas siguen caminos pintados; 6 pares sin
  ruta directa (los resuelve multi-etapa) — **descartados definitivamente**.
- **Receta "dos caminos"** guardada en `docs/RECETAS.md` (sección reutilizable).

### Dos caminos + 5 rutas mejoradas ✓ (2026-11-03)

- **`arv-sand` = DOS rutas**: `arv-sand-bay` (**Bahía**, 19 pts, 23 wp sobre la costa de
  Vorn Bay) + `arv-sand` (**Bosque**, 23 pts, conserva su trazo y costo).
- **5 rutas con waypoints reemplazados** por los trazos aprobados del usuario, costos
  sin cambio: arv-vorn (19 wp), dh-vorn (50), arv-dh (60), arv-wg (50), wg-stark-bay (71).
- **`destinationsFrom`**: una fila por ruta directa (más barata primero, campo `via`);
  `trip.route` guarda la ruta elegida; `markerPosition` la respeta con fallback
  retrocompatible; fila "Ciudad · por X".
- **Probado en navegador**: ambas rutas ida/vuelta, marcador **0.000% sobre el trazo
  elegido**, consola limpia, test de lógica 13/13, capturas.
- **Ajustes (2026-11-03)**: `sand-stark` **eliminada** (no existía), `vorn-sand`
  **re-trazada** con 25 wp del usuario (costo sin cambio), quedan **9 rutas**. App
  recargada: consola limpia, destinos OK (Starkrock desde Sandquill ahora multi-etapa).
  Mapa de referencia con colores: `/tmp/opencode/rutas-finales.png`.

### Publicar online ✓ (2026-11-03)

- **GitHub Pages en vivo**: https://facilestapps-creator.github.io/el-camino-del-heroe/
- Repo `github.com/facilestapps-creator/el-camino-del-heroe` (público), rama `main`,
  deploy automático en cada push. **git init** del proyecto + clave SSH configurada en la
  máquina (`~/.ssh/id_ed25519`) — publica el agente sin intervención.
- Verificado en vivo: HTTP 200 con MIME correctos (js/json/css/webp), `world.json` remoto
  con 9 rutas, app navega (Hoy ↔ El camino, 6 destinos con las 2 filas de Sandquill),
  **consola sin errores ni warnings**, localStorage funcionando en el dominio.
- **Los datos del usuario NO se suben**: quedan en el localStorage de cada navegador.

### App instalable ✓ (2026-11-03)

- **`data/manifest.json`** (nombre/textos en `data/` por la regla de cero strings
  hardcodeados): "El camino del héroe" / short "El camino", `display: standalone`,
  `start_url`/`scope: "../"`, theme `#0f172a`.
- **Íconos desde el mapa** (decisión del usuario): recorte cuadrado de la isla →
  `assets/icons/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (isla al 78 %
  sobre fondo `#0f172a`), `apple-touch-icon.png` (180).
- **Sin offline / sin service worker** (decisión del usuario: "solo instalable") — y ya
  **no hace falta SW** para instalar: Chrome 108/112+ lo dejó de requerir (doc oficial).
- `index.html`: links manifest + icon + apple-touch-icon + theme-color.
- **Verificado**: local y en vivo — manifest200 y parsea, íconos200 `image/png`,
  consola limpia. `beforeinstallprompt` no dispara acá porque el navegador del entorno
  es **Electron** (limitación del entorno); prueba final = instalar en el Chrome real
  del usuario (pedida en el reporte).

### Ajuste 1 — Ingreso de pasos ✓ (2026-11-03 → 04)

Tarea única de la auditoría del usuario: arreglar el ingreso de pasos.

- **M1**: el campo de pasos **nunca se bloquea** (sin `disabled`, sin clase `locked`,
  sin tag "Enviado") — `ui.js` acota el bloqueo a `style !== 'number'`; los hábitos
  **por niveles** siguen bloqueándose tras Enviar.
- **M2**: validación en la capa de lógica — `validateSteps(entry, steps, stepsPerPoint,
  maxSteps)` en `habits.js` (mínimo = `sentPoints × stepsPerPoint`, tope =
  `maxSteps: 30000` en `habits.json`, vacío/no numérico = 0). `saveSteps` llama a
  `validateSteps` y **rechaza** (devuelve `daysData` sin cambios, sin tocar
  localStorage). En pantalla: revert al último valor guardado + mensaje debajo
  (`stepsMinMessage`/`stepsMaxMessage` desde `texts.json` con `fillText`); el mensaje
  desaparece en el siguiente cambio válido.
- **M3 (probado en navegador)**: a) 3000 → Enviar → 5000 = 3 pendientes → Enviar =
  total 7 ✓ · b) 1000 tras enviado = rechazado con mensaje y revert ✓ · c) 30001
  rechazado / 30000 aceptado ✓ · d) persiste tras recargar ✓ · e) niveles siguen
  bloqueados tras Enviar ✓. Tests de lógica en Node: 22/22 OK. Consola limpia.
- **M4**: regla de pasos en `DECISIONES.md` (⭐ Puntos); tope "si sale a producción"
  quitado de Pendientes (ya implementado).

### P5 — Refactor en 4 mini-bloques ✓ (2026-11-04)

Sin cambios de comportamiento (spec en `DECISIONES.md`, sección "Capas del código"):
- **5a** (`f33d4ec`): capas de almacenamiento — `localStorage` solo en `storage.js`,
  `fetch` solo en `dataFiles.js`, prefijo `habitQuest:` una sola vez en `config.js`,
  respaldo delegando en storage.
- **5b** (`52cd24b`): `app.js` = orquestador con `session { daysData, levelsByHabit,
  worldState }` y `refresh() = updateState() + renderAll()` (actualizar separado de
  dibujar); handlers en `habitsFlow.js` / `worldFlow.js` / `backupFlow.js`.
- **5c** (`7e86aba`): código muerto eliminado — rama cíclica, `lockedTag`/`disabled`
  inalcanzables, `getLevelOf` duplicado, textos huérfanos (`habitStart`, `tagline`,
  `welcome`); test de estilos (`direct`/`number`) nuevos.
- **5d** (`b1b4bb6`): textos con variables — 14 plantillas `{var}` en `data/` +
  `fillText` en `ui.js`/`worldUI.js`; cero concatenaciones de textos en el código.
- **Probado (smoke completo en navegador, 2026-11-05)**: 35/35 pruebas; todas las
  claves de texto usadas existen en `data/`; 16/16 strings idénticos a los del código
  viejo; `node --check` en los 14 módulos. En pantalla: tap, pasos, enviar, viaje,
  cancelar con reembolso, entrar, explorar, dragón (ambos lados) — y **todos los
  textos 5d** (Estás en / Viajando / Faltan / Llegaste / Entrar / Explorar · 40 /
  dos caminos / 212 · ¡Dragones! / Enviar (N) / +N pendientes / Disponible /
  700 pasos) con **consola sin errores ni warnings**. Datos del usuario restaurados
  tras el smoke.

### P6 — Costos de ruta derivados del largo ✓ (2026-11-05)

- **`world.json`**: los 9 routes perdieron el `points` manual; nuevos campos
  `imageSize` (963×1121) y `pxPerPoint` (13,6) junto al `image` existente.
- **`world.js`**: `hydrateRouteCosts` (llamado desde `getWorld`) calcula
  `points = round(largo_px ÷ 13,6)` por polilínea (ciudad origen → waypoints →
  ciudad destino); `segmentLengthPx` unifica costos y marcador — **desaparece el
  factor 0,859 hardcodeado**.
- **Costos nuevos** (×4 en pantalla): Vornstead 68 · WGlades 140 · Dar'Hanok 160 ·
  Bahía 76 (igual) · Bosque 116 · Starkrock 144 · dragón 188 (era 212).
  **Σ base = 282** ✓ (3.827 px ÷ 13,6 con redondeo por ruta).
- **Probado**: 37/37 pruebas (2 nuevas: total 282 + datos sin `points` manual);
  smoke en navegador en `127.0.0.1` (la caché de localhost servía `world.json`
  viejo): filas con costos nuevos, "Starkrock 188 · ¡Dragones!", diálogos,
  **consola limpia**; el viaje a mitad de camino del usuario restaurado byte a byte.

## Pendientes

El plan vive en **[`docs/overview.md`](overview.md)** (Plan de trabajo, con los P1–P6
tildados a medida que se completan). Este archivo solo registra lo hecho.

## Sin planificar

- Tienda.

## NO HACER hasta que se pida

- Nada que esté fuera del bloque/fase en curso.
