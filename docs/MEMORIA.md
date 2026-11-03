# MEMORIA — estado del proyecto "El camino del héroe"

> Archivo de continuidad para cualquier chat/agente nuevo. Leer junto con `AGENTS.md`
> (reglas permanentes), `docs/ROADMAP.md` (orden de fases), `docs/DECISIONES.md`
> (decisiones de diseño + specs de los bloques A/B/C y Fase 2) y `README.md` (estructura).
> Actualizar después de cada bloque/fase. Última actualización: 2026-11-01.

## 🔎 Auditoría (2026-10-30 → 2026-10-31) — COMPLETA: M1–M7 ✓

**Protocolo de esta tanda**: mini-bloques M1→M7 **sin esperar OK** entre ellos (frenar
solo por dudas reales), probar cada M en navegador, y **dejar un bkp acá al cerrar cada M**
(pedido del usuario por si faltan créditos). Al final: README + ROADMAP + DECISIONES de a
un archivo por tanda. Reglas: textos nuevos solo en texts.json/world.json (cero strings en
código), lógica nunca en la UI, nada pedido = nada agregado.

**Estado**: **M1 ✓ · M2 ✓ · M3 ✓ · M4 ✓ · M5 ✓ · M6 ✓ · M7 ✓** — tanda COMPLETA
(detalle abajo). Las specs completas de M1–M7 las dio el usuario en la sesión (auditoría
de Claude); resumen de M5–M7 abajo.

**Dudas resueltas con el usuario (NO re-preguntar):**
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

**Respaldos de datos**: datos reales del usuario (13 pts de 2026-10-29, Arvandill, sin
viaje) en `/tmp/opencode/respaldo-usuario-m1.json` (también valía para la Fase 2:
`respaldo-usuario-m3.json`). Restaurados y verificados tras M1.

### M1 — LIMPIEZA ✓ (2026-10-30)

- **app.js**: borrados imports sin uso (`SCHEMA_VERSION`, `saveDays`) y el comentario
  que los justificaba; `computeBalance` usa **`worldState.spent`** (fuente única de
  verdad, en memoria + `saveWorldState`) — `loadWorldSpent()` eliminada de storage.js;
  `saveTodayLevel` **ya no muta `daysData`** (devuelve el objeto nuevo y quien llama
  reasigna: `daysData = saveTodayLevel(...)`); textos hardcodeados fuera:
  `'Hoy'` (2 lugares), `'Puntos de hoy'` → desde texts.json, `'Aceptar'` →
  `world.texts.dragonAccept` (clave **agregada** a world.json).
- **js/text.js (NUEVO)**: helper `textOf(bag, key)` → clave faltante = **vacío +
  console.warn** con el nombre de la clave.
- **storage.js**: `loadWorldSpent` borrada; `WORLD_KEY` quitado de sus imports.
- **world.js**: comentario "decisión 2026-01-30" → **2026-10-30**.
- **Probado en navegador**: textos "Hoy"/"Puntos de hoy" desde data; toggle marca/
  desmarca 13→16→13 (guardado `{level,points}` correcto, sin mutación de referencia);
  vista El camino OK (5 destinos); modal de dragón con botón **"Aceptar"** desde data y
  consola **sin errores ni warns**. Slip-up corregido en el acto: faltó el import de
  `textOf` en worldUI.js.

### M2 — DRAGONES sin re-tiradas ✓ (2026-10-30)

- **world.js**: campo **`dragonRolls: { "<edgeId>": true|false }`** — default `{}` en
  `freshState` **y** en `loadWorldState` (armado campo por campo, validado como objeto
  no-array). Nueva función **`rollDragon(state, world, edgeId)`**: si ya hay booleano
  guardado para ese tramo → lo devuelve `{isDragon, cached:true}` **sin tirar**; si no,
  tira (`Math.random < dragonProbability`), lo **escribe en el estado** y lo devuelve
  `{isDragon, cached:false}`. `enterCity` **borra `dragonRolls = {}`** al entrar.
- **app.js**: al iniciar viaje con tramo dragón → `rollDragon(...)` +
  **`saveWorldState` inmediato (persiste AL TIRAR, antes de animación/aceptar)** →
  `showDragonCoin(world, roll, beginTrip)`.
- **worldUI.js**: `showDragonCoin` ya NO tira (sin `Math.random`): solo MUESTRA.
  `roll.cached` → **directo con el resultado, sin animación** (finish() inmediato);
  si es fresco → animación 1.4s. Al terminar, la moneda queda quieta en el lado que tocó
  (clase `landed` [+ `show-clear` si salió despejado]) — esto además arregló un detalle
  visual: antes la moneda siempre mostraba 🐉 tras la animación.
- **CSS**: `.coin.landed.show-clear .coin-inner { transform: rotateY(180deg); }`.
- **Probado (los 3 pedidos, con datos de prueba 600 pts y restauración posterior)**:
  ① **cancelar y reelegir** → mismo resultado (`Faltan 412` con dragón, cancel conserva
  rolls, reeligrir da "¡Salieron dragones!" sin flip); ② **recargar durante la animación**
  → roll sigue en storage y el reintento muestra el **mismo resultado sin animación**;
  ③ **tras Entrar** → `dragonRolls {}` y **se vuelve a tirar** (roll fresco con flip).
  Plus: roll presente en storage **durante** la animación; viaje con dragón inicia a 424;
  consola sin errores. Slip-ups míos corregidos en el acto: click sobre `.trip-cancel`
  inexistente (acepté un viaje que ya había llegado — en estado "Llegaste" no hay
  Cancelar) y el import faltante de `textOf` (M1).
- **Datos del usuario restaurados y verificados**: 13 pts, hoy sin marcas, Arvandill,
  `dragonRolls: {}` (campo nuevo en su estado).

### M3 — ENVIAR + PASOS MANUALES (esquema v3) ✓ (2026-10-30)

- **config.js**: `SCHEMA_VERSION = 3`.
- **habits.json**: `pasos` → `"style": "number"` (sin minDesc/fullDesc/minPoints/
  fullPoints); raíz con `"stepsPerPoint": 700`.
- **texts.json** (+claves): `sendLabel` "Enviar", `pendingLabel` "pendientes",
  `habitLocked` "Enviado", `stepsRule` "{stepsPerPoint} pasos = 1 punto".
- **index.html**: `<button id="send-btn">` (clase `send-btn`) bajo `#habits-list`.
- **habits.js**: `getHabitsData()` → `{stepsPerPoint, habits}` (reemplaza a
  `getHabits`); `saveTodayLevel` con **bloqueo** si `sentPoints > 0` (devuelve
  daysData sin tocar) y guarda `{level, points, sentPoints: 0}`; **`saveSteps(
  daysData, habitId, steps, stepsPerPoint)`** → `{steps, points, sentPoints}` con
  `points = max(sentPoints, floor(steps / stepsPerPoint))` (sin tope, no baja de
  lo enviado); `computeDayPoints` → `{pointsByHabit, total, sent, pending}`;
  `computeTotalSent` (Σ sentPoints, **reemplaza** a `computeTotalEarned`);
  `sendTodayPoints` / `sendPastDays` / `sendDay` (sentPoints = points; sin cambio
  → no guarda); `migrateDaysData` v1/v2→v3 con `migrateEntry` + `stepsForLevel`
  (2500/5000, **points NO recalculados**, fallback minPoints ?? 1 / fullPoints ?? 3).
- **ui.js**: `renderHabitList(habits, levelsByHabit, texts, stepsPerPoint)` —
  `locked` (sentPoints > 0 → botones/input `disabled` + clase `locked` + tag
  `habitLocked`); rama `style === 'number'` con input `type=number`
  (`data-steps-habit`, value = entry.steps) + regla `stepsRule` con `{stepsPerPoint}`
  reemplazado; **`renderPoints(sent, pending, label, pendingLabel)`** (pendientes en
  `span.points-pending` con `+N` y label); **`renderSendButton(pending, label)`**
  ("Enviar (N)", disabled si N ≤ 0); import de `textOf`.
- **app.js**: imports `getHabitsData`/`saveSteps`/`computeTotalSent`/`sendTodayPoints`/
  `sendPastDays`/`renderSendButton`; `stepsPerPoint` de habits.json (fallback 700);
  `sendPastDays` al cargar **y** en `visibilitychange`; `computeBalance` =
  `computeTotalSent(daysData) - worldState.spent`; `renderAll` pasa
  `stepsPerPoint` y sent/pending; delegado `change` en `.habit-steps` → `saveSteps`;
  click `#send-btn` → `sendTodayPoints`; quitada la recarga redundante
  `migrateDaysData(loadDays())` del click de hábitos.
- **CSS**: `.send-btn` (+disabled), `.habit.locked` (opacity), `.habit-locked-tag`,
  `.points-pending`/`.points-pending-count`, `.habit-number`/`.habit-number-rule`,
  `.habit-steps` (+disabled).
- **backup.js**: sin cambios (esquema-agnóstico — la validación fuerte es M6).
- **Probado en navegador (datos reales del usuario como base; restauración final)**:
  ① **migración v2→v3** con sus 13 pts → pasos `{steps:2500, points:1, sentPoints:1}`,
  saldo intacto 13; ② **pendiente no mueve saldo** (marcar Lectura → "+3 pendientes",
  Disponible sigue 13); ③ **Enviar** → saldo 16, botón "Enviar (0)" deshabilitado,
  hábito **bloqueado** (tag "Enviado", botones disabled) y tocarlo no cambia nada;
  ④ **pasos acumulativos** 3000 (4 pts) → 5000 (7 pts, reemplaza) → Enviar suma +7
  (23) e input queda disabled; ⑤ **bajar pasos no baja de lo enviado** (saveSteps con
  1000 tras enviado 7 → points queda 7); ⑥ **varias veces por día** (2do hábito
  "Agua" → Enviar (1) → saldo 24, Lectura sigue bloqueada); ⑦ **auto-envío de día
  anterior** (29/10 con pendientes → al cargar sentPoints = points, saldo 18 = 11+7);
  ⑧ **migración v1** inyectada (pasos level 2 → `{steps:5000, points:3, sentPoints:3}`
  con fallback, saldo 7); consola **sin errores ni warns**. Slip-up propio corregido:
  selector `.habit-btn.complete` inexistente (los botones directos son `[data-level]`).
- **Datos del usuario restaurados y verificados**: 13 pts, hoy sin marcas, Arvandill,
  `dragonRolls: {}`, Enviar (0).

### M4 — SIN PUNTOS SUFICIENTES + CARTEL 2 OPCIONES ✓ (2026-10-30)

- **text.js**: nuevo helper **`fillText(template, vars)`** (reemplaza `{key}` por valor;
  textos con variables SIEMPRE armados desde data).
- **world.json** (texts): quitado `travelButton`; añadidos **`travelOnlyOption`**
  "Viajar a {city}", **`travelFullOption`** "Viajar, entrar y explorar {city}",
  **`notEnoughTravel`** "Tenés {balance}, te faltan {missing}… ¿empezar el camino igual?",
  **`notEnoughExplore`** "Tenés {balance}, te faltan {missing}".
- **index.html**: modal de respaldo → **genérico** `#confirm-overlay` / `#confirm-text`
  / `#confirm-actions` (un solo cartel para respaldo, viajes, etc.).
- **styles.css**: `.backup-confirm*` → **`.confirm-*`** (mismo aspecto; `.confirm-accept`
  rojo por defecto, **`.confirm-accept.confirm-go`** azul para acciones de viaje;
  `.confirm-text:empty` oculto — el cartel de 2 opciones va sin mensaje). Filas: borrados
  `.dest-row.selected`/`.dest-travel`; nuevos **`.dest-enter`**, **`.dest-explore:disabled`**,
  **`.dest-not-enough`** (aviso rojo de faltante).
- **ui.js**: `showBackupConfirm`/`hideBackupConfirm` → **`showConfirm(message, buttons)`**
  (botones `[{label, className, onClick}]`, se rellenan desde data) / **`hideConfirm()`**.
- **world.js**: **`startTrip(state, dest, cost, dragon, withExplore)`** (plan full: el
  costo ya incluye los 40 de explorar); **`settleArrival(state)`** (viaje al 100%:
  `currentCity` = destino; si `withExplore` → visited + explored + `trip=null` +
  `dragonRolls={}`; sin explore deja el viaje en estado "llegado" para Entrar);
  **`markerPosition(world, state)`** (con viaje interpola **proporcional** por costo a lo
  largo del camino Dijkstra con pesos = `pathCost`); **`exploreCity` exige
  `visited.includes(currentCity)`** (Entrar habilita Explorar).
- **worldUI.js**: imports +`markerPosition`/`tripArrived`/`fillText`; `renderWorldMap`
  usa `markerPosition`; **`renderWorldPanel(world, state, worldTexts, balance, handlers)`**
  reescrito: viajando (Faltan + Cancelar) → llegado (título "Llegaste a X") →
  **`appendCityActions`** (Entrar si `arrived || !entered`; luego Explorar deshabilitado
  si `!entered || balance<cost` con `.dest-not-enough`, o etiqueta "Explorada")
  **SIEMPRE ANTES de la lista** de destinos (nunca abajo de la página); filas sin
  `selected` ni botón `.dest-travel` → click = `handlers.onSelectDestination`.
- **app.js**: imports +`fillText`/`showConfirm`/`hideConfirm`/`settleArrival`
  (quitados `tripArrived`/`hasExplored`); quitado `selectedDestId`; `renderAll` llama
  **`settleArrival`** (guarda si cambió) y pasa **`computeBalance()`** como `balance`;
  `onSelectDestination(cityId)` → **cartel de 2 opciones** (Viajar a X / Viajar, entrar
  y explorar X / Cancelar) vía `fillText`; **`choosePlan(found, withExplore)`**:
  cierra cartel → si tramo dragón: `rollDragon` + `saveWorldState` (persiste al tirar) +
  `showDragonCoin` → tras la moneda verifica `computeBalance()` vs costo final
  (`costWithDragon ? … : cost` **+40 si plan full**) → si falta → cartel
  `notEnoughTravel` con Aceptar (inicia viaje con `withExplore`) / Cancelar (no pasa
  nada, moneda ya guardada); si alcanza → viaje directo. Flujo **importar respaldo**
  ahora usa `showConfirm` con callbacks en línea (borrados los listeners
  `#backup-confirm-accept/cancel` que ya no existen).
- **Probado en navegador (datos reales como base; restauración final)**:
  ① clic en fila → **cartel 2 opciones** con los textos exactos + Cancelar;
  ② **sin saldo sin dragón** → "Tenés 13, te faltan 151… ¿empezar el camino igual?"
  (Aceptar inicia / Cancelar no pasa nada, trip null);
  ③ **Aceptar inicia viaje** con flujo parcial (13 fluyeron, "Faltan 151", marcador
  avanzó 13/164) → **Cancelar con refund** (spent 0, saldo 13, marcador volvió);
  ④ **plan full sin saldo** → "te faltan 191" (164+40−13: el faltante **incluye los 40**);
  ⑤ **saldo suficiente** → viaje completo al instante: `currentCity` cambió, marcador en
  destino, "Llegaste a Sandquill" + Entrar + Explorar **antes** de la lista;
  ⑥ **Explorar deshabilitado sin Entrar** → Entrar (gratis, registra visited, borra
  dragonRolls, habilita Explorar) → Explorar (−40, etiqueta "Explorada");
  ⑦ **plan full con saldo** → llega con visited + explored juntos, `trip:null`;
  ⑧ **dragón**: moneda **primero** (tirada persistida ANTES de aceptar; recarga no
  re-tira; cacheada sin animación) → **luego** cartel de saldo; tirada TRUE → costo
  doble **424** en el cartel; ⑨ aceptar con saldo 0 inicia el viaje ("Faltan 212");
  ⑩ **viaje completado durante recarga** → llegada automática (currentCity + marcador);
  ⑪ **marcador proporcional en tramo intermedio** de camino de 2 tramos (verificado
  con el cálculo: progress 100 → 44/164 = 0.268 → x 48.2 / y 56.7 ✓ — el saldo fluye
  solo y completa el progreso);
  ⑫ **modal genérico en importar**: Cancelar no toca nada; Aceptar aplica + recarga
  (restauró los datos reales); consola **sin errores ni warns** en todos los tests.
  Slip-ups propios corregidos: clics `.click` sin `()` en 3 tests (rehechos).
- **Datos del usuario restaurados y verificados vía importar**: 13 pts (v3), hoy sin
  marcas, Arvandill, `spent:0`, `dragonRolls:{}`, Enviar (0).

### M5 — TEXTOS POR CIUDAD (historias) ✓ (2026-10-31)

- **Qué se hizo**:
  - **Nuevo `data/stories.json`**: envoltorio `{"stories": {idCiudad: texto}}` con las
    6 ciudades; placeholder `"Historia pendiente: {name}"` (el nombre se completa desde
    `world.json` con `fillText`, sin duplicar texto entre archivos).
  - **`js/app.js`**: `loadJSON('stories')` junto a texts/habits/world → `storiesBag`;
    se pasa a `renderWorldPanel` (ahora 6 params).
  - **`js/worldUI.js`**: firma `renderWorldPanel(world, state, worldTexts, storiesBag,
    balance, handlers)`; en `appendCityActions`, bajo la etiqueta "Explorada" →
    `<p class="city-story">` con `fillText(story, { name })`; si falta la historia →
    `console.warn('Falta la historia de la ciudad:', id)` y no se muestra nada (la
    etiqueta "Explorada" queda igual).
  - **`css/styles.css`**: `.city-story` (gris, centrado, bajo "Explorada").
- **Pruebas en navegador (4 escenarios + restauración)**:
  ① Arvandill explorada → etiqueta "Explorada" + **"Historia pendiente: Arvandill"**
  debajo, antes de la lista de destinos ✓; ② ciudad entrada sin explorar → sin etiqueta
  ni historia, botón "Explorar · 40" (deshabilitado: "Tenés 4, te faltan 36") ✓;
  ③ quité `starkrock` de stories.json → explorada muestra solo "Explorada" +
  `console.warn('Falta la historia de la ciudad: starkrock')` en worldUI.js:229 ✓;
  ④ restauré stories.json → historia de Starkrock vuelve ✓; consola **sin errores ni
  warns** en todos los escenarios.
- **Obstáculo resuelto (caché HTTP del navegador)**: los ES modules se cacheaban por
  `Last-Modified` (heurística de frescura ~10% de la edad ≈ 2 h) y `transferSize: 0`
  servía `worldUI.js` viejo pese a disco + `curl` correctos. Solución: servidor de
  prueba `/tmp/opencode/serve_no_cache.py` (mismo `http.server` + `Cache-Control:
  no-store`) en :8000 y **pestaña en `127.0.0.1:8000`** (origen distinto = clave de
  caché distinta → módulos frescos, `firma === 6` verificada).
- **Datos del usuario restaurados** en `localhost:8000`: 13 pts (v3), 29/10, Arvandill
  visitada, sin explorar, sin viaje, `spent:0`, `dragonRolls:{}`. El `explored`
  inyectado durante el test se quitó; respaldo del respaldo en
  `/tmp/opencode/respaldo-usuario-m1.json`.

### M6 — RESPALDO VALIDADO + "ÚLTIMO RESPALDO" ✓ (2026-10-31)

- **Qué se hizo**:
  - **`config.js`**: `META_KEY = 'habitQuest:meta:v1'` y `BACKUP_STALE_DAYS = 7`
    (umbral configurable).
  - **`backup.js`**: `loadMeta()` (robusta a JSON malformado); `saveLastBackupAt()`
    escribe `meta.lastBackupAt` (ISO) **ANTES** de armar el archivo → queda incluido
    dentro del respaldo (`collectBackupData` lo toma por el prefijo `habitQuest:`);
    `daysSinceBackup(meta)` → días completos desde el último export, `null` = nunca;
    `exportBackup()` ahora marca la fecha primero. **Validación ampliada** en
    `isValidBackup`: si el archivo trae `data:v1` debe cumplir el esquema
    (`days` objeto; cada día objeto; cada hábito objeto con `level`/`points`/
    `sentPoints`/`steps` numéricos si están — cubre esquemas 1/2/3); si trae
    `world:v1` → `spent` numérico, `currentCity` string, `visited` y `explored`
    arrays; claves ausentes = OK (archivo sin esas claves); strings JSON viejos se
    parsean a la vez (`parseIfNeeded`). Si no cumple → inválido **sin tocar datos**.
  - **`texts.json`**: `lastBackupDays` ("Último respaldo: hace {days} días"),
    `lastBackupOneDay` (singular), `lastBackupToday` ("hoy"), `lastBackupNever`
    ("nunca").
  - **`index.html`**: `<p class="backup-last" id="backup-last" hidden>` bajo los
    botones (fuera del flex `.backup`), antes de `#backup-error`.
  - **`ui.js`**: `renderLastBackup(message, highlight)` (toggle clase
    `.backup-last--stale`).
  - **`app.js`**: helper `renderLastBackupLine()` (nunca → resaltado + texto; 0 →
    "hoy"; 1 → singular; ≥2 → `fillText` con días; ≥ `BACKUP_STALE_DAYS` →
    resaltado ámbar). Se llama al inicio y tras cada clic en Exportar.
  - **`css/styles.css`**: `.backup-last` (gris, centrado) + `.backup-last--stale`
    (ámbar, bold).
- **Pruebas en navegador (7 tests)**:
  ① sin meta → "Último respaldo: nunca" visible y **resaltado** ✓; ② clic Exportar →
  "hoy" sin resaltar + `meta:v1` con `lastBackupAt` reciente (edad 39 ms) ✓;
  ③④⑤ metas simuladas → "hace 8 días" **resaltado** (≥7), "hace 1 día" y "hace
  2 días" sin resaltar ✓; ⑥ importar archivo con `data:v1` malformado (día = string)
  → "El archivo no es un respaldo válido." + datos **sin cambios** + overlay cerrado ✓;
  ⑥b idem con `world:v1` (`visited` no-array) ✓; ⑦ archivo válido (esquema 3 +
  world + meta) → cartel Aceptar/Cancelar → aceptar aplica + recarga: días, sentPoints,
  spent:40, western-glades y label "hoy" (meta del archivo) ✓; ⑧ `createBackup()`
  tras exportar → archivo **incluye** `habitQuest:meta:v1` y pasa `isValidBackup` ✓.
  Consola **sin errores ni warns** en todos.
- **Datos del usuario restaurados** en ambas pestañas de prueba (13 pts, 29/10,
  Arvandill, sin explorar, sin viaje, `meta:v1` borrada → "nunca" como corresponde).

### M7 — DOCS ✓ (2026-10-31)

- **README.md**: estructura actualizada (agregado `data/stories.json`).
- **docs/ROADMAP.md**: sección "Auditoría M1–M7 ✓" con los 7 mini-bloques y sus
  pendientes (publicar online, app instalable, historial, hitos, perseguidor).
- **docs/DECISIONES.md**: sección "🔍 Auditoría M1–M7" (limpieza, dragones sin
  re-tiradas, esquema v3 con Enviar/sentPoints/pasos, cartel 2 opciones, historias
  por ciudad, respaldo validado + último respaldo).

### Specs M5–M7 (resumen — las completas están en el mensaje del usuario)

- **M2 Dragones sin re-tiradas**: `dragonRolls: { "<edgeId>": true|false }` en
  worldState (default `{}` en freshState **y en loadWorldState campo por campo**);
  persistir **al tirar**, no al aceptar; si ya hay resultado guardado → mostrarlo con el
  mismo cartel **sin animación**; borrar `dragonRolls` al **Entrar**. Probar: cancelar y
  reelegir = mismo resultado; recargar durante animación = mismo; tras Entrar se re-tira.
- **M3 Enviar + pasos manuales (esquema v3)**: modelo `{ level, points, sentPoints }`
  (pendientes = points − sentPoints, no se recalculan); SCHEMA_VERSION **3** con
  migración v2→v3 (todo pasa a sentPoints = points → saldo NO cambia; probar con datos
  v2 **y** v1); Disponible = Σ sentPoints − worldState.spent (los pendientes NO suman ni
  fluyen); botón **Enviar** bajo la lista con pendientes (deshabilitado si = 0, varias
  veces por día); hábito con sentPoints > 0 → **bloqueado** (ambos botones deshabilitados
  + marca con texto de texts.json; sin subir de Mínimo a Completo ni desmarcar);
  **pasos = `style: "number"`** en habits.json (sin minDesc/fullDesc/minPoints/fullPoints):
  campo numérico enteros ≥ 0 con el **TOTAL** del día, points = floor(pasos/700),
  acumulativo, Enviar suma solo la diferencia, muestra regla "700 pasos = 1 punto" desde
  texts; migración pasos: level 1/2 → `{ steps: 2500|5000, points: <guardados>,
  sentPoints: <guardados> }`; al cargar y en visibilitychange → días anteriores con
  pendientes se auto-envían (sentPoints = points); "Puntos de hoy" muestra enviados +
  pendientes (pendientes distinguibles). Probar todo el listado.
- **M4 Sin puntos suficientes**: generalizar el cartel de confirmación (hoy de respaldo)
  para reutilizarlo; Viajar: si Disponible < costo final (tras la moneda si hay dragones)
  → cartel "Tenés X, te faltan Y… ¿empezar el camino igual?" (texto con variables en
  world.json); Aceptar empieza el viaje (los puntos fluyen al enviar), Cancelar no pasa
  nada (la moneda ya quedó guardada); si alcanza → empieza directo. Explorar nunca
  parcial: botón deshabilitado + "Tenés X, te faltan Y". **Tu addition**: elegir ciudad →
  cartel con "Viajar a X" / "Viajar, entrar y explorar X" (reemplaza el botón Viajar
  suelto); y el botón Explorar NO abajo de la página (ver decisión arriba).
- **M5 Textos por ciudad**: crear `data/stories.json` (6 ids de ciudad, placeholder
  "Historia pendiente: <nombre>"); `loadJSON('stories')`; si la ciudad actual está
  explorada → mostrar su texto bajo la etiqueta "Explorada"; si falta la ciudad → nada +
  console.warn. Nada más de contenido.
- **M6 Respaldo**: validar ANTES de aplicar (data:v1 = objeto con days y entradas
  numéricas válidas de esquemas 1/2/3; world:v1 = spent numérico, currentCity texto,
  visited y explored arrays); si algo no cumple → mensaje de inválido y NO tocar datos;
  clave **`habitQuest:meta:v1`** `{ lastBackupAt (ISO) }` actualizada **ANTES** de armar
  el archivo (queda dentro del respaldo); mostrar bajo los botones "Último respaldo: hace
  N días" ("hoy" si 0, "nunca" si no hay) con textos en texts.json; resaltar si ≥ 7 días
  o nunca (umbral en **config.js**).
- **M7 Docs**: README (estructura con data/stories.json), ROADMAP (mini-bloques hechos;
  pendientes: **publicar online**, app instalable, historial, hitos, perseguidor),
  DECISIONES (Enviar/sentPoints, pasos manuales, dragones persistidos, esquema v3,
  respaldo con validación).

## Waypoints en rutas + herramienta de trazado (2026-11-01) ✓

- **`waypoints: [{x,y}]`** por ruta en `world.json` (% sobre `world-map-crop.webp`,
  963×1121), en orden **from→to**; interpolación por longitud (`pointAlongRoute`,
  `routeSegmentLength`, factor **0,859** en x por el aspecto de la imagen);
  **retrocompatible**: sin waypoints = recta. `edgeWaypointsOrdered` solo invierte el
  orden al viajar en sentido contrario.
- **Rutas con waypoints escritos** (lista `id (nº de waypoints)`, estado final
  2026-11-03): arv-vorn (19), arv-sand (13), arv-sand-bay (23), vorn-sand (25),
  arv-stark (53), dh-vorn (50), arv-dh (60), arv-wg (50), wg-stark-bay (71).
  **9 rutas** en total. Costos: 14–53 pts según largo (sin cambio respecto del cálculo
  por largo). Cambios del 2026-11-03: 5 rutas con waypoints reemplazados por los trazos
  aprobados del usuario, `arv-sand-bay` nueva, **`sand-stark` ELIMINADA** (el usuario
  confirmó que esa ruta no existe) y **`vorn-sand` re-trazada** con los waypoints que
  entregó el usuario (25 wp, siguen el camino pintado — ver sección "dos caminos").
- **`arv-stark` (53 pts)** probada a full: 20 fracciones con desvío máx 0,05 % sobre el
  trazo, marcador a mitad/75 % sobre el camino, vuelta en espejo exacto, consola limpia.
- **`tools/waypoints.html`** (aprobada): clics sobre el mapa, zoom (rueda) + pan,
  grilla 5 px, deshacer, **📋 Copiar JSON** → el usuario lo pega en el chat.
  **Nunca medir capturas pegadas a ojo** (llegan deformadas).
- **Revisión de rutas (solo lectura)**: las **9 rutas siguen caminos pintados** del mapa
  (a 3–16 px del camino detectado); 6 pares de ciudades **sin ruta directa** (WG↔DH,
  WG↔Vorn, WG↔Sand, DH↔Sand, DH↔Stark, Vorn↔Stark — los resuelve el multi-etapa);
  overlays en `/tmp/opencode/rutas-revision.png`, `rutas-crops.png`, `rutas-cadenas.png`.
  Detección automática de cadenas/blancos **inconclusa** → el **usuario** lista los
  pares con **DOS caminos pintados** (más rápido y más confiable).

## Flujo "dos caminos entre dos ciudades" (2026-11-01) — RECETA REUTILIZABLE

Situación: entre dos ciudades hay **DOS caminos pintados** en el mapa y el viajero debe
poder **elegir** cuál tomar (ej.: Arvandill→Sandquill por bosque o por bahía). Puede
repetirse en cualquier revisión de rutas.

**Pasos:**

1. **Trazar** ambos caminos con `tools/waypoints.html` (clics sobre el mapa con zoom/pan;
   el usuario pega el JSON en el chat). **Nunca medir capturas pegadas a ojo** — llegan
   deformadas; usar la herramienta o el detector programático
   (`/tmp/opencode/cadenas-mapa.txt`, 32 cadenas de caminos pintados).
2. **Costos por largo**: `points ≈ largo_px × 0,079` (k promedio de las rutas existentes;
   el largo en % lleva factor 0,859 en x por el aspecto 963×1121). Proponer costos al
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

**Estado (2026-11-03): IMPLEMENTADO ✓ y probado en navegador.**
- `world.json`: **9 rutas** (estado final 2026-11-03) — `arv-sand-bay` nueva
  (`via: "Bahía"`, **19 pts**, 23 wp del
  trazo del usuario sobre la cadena pintada de la costa de Vorn Bay, verificado con crops
  de zoom: sigue los puntitos y toma el fork correcto) + `arv-sand` gana `via: "Bosque"`
  (23 pts intactos). Las **5 rutas mejoradas** con los trazos aprobados del usuario
  (costos SIN cambio): arv-vorn 19 wp, dh-vorn 50 wp (invertido a orden from→to),
  arv-dh 60 wp, arv-wg 50 wp, wg-stark-bay 71 wp.
  **Ajustes posteriores (2026-11-03, pedido del usuario)**: `sand-stark` **ELIMINADA**
  (esa ruta no existía) y `vorn-sand` **re-trazada** con los 25 waypoints que entregó el
  usuario (antes 7, "fuera del camino") — costos sin cambio.
- `world.js`: `destinationsFrom` → una fila por ruta directa cuando hay varias entre dos
  ciudades (de más barata a más cara), cada fila con `route`; `startTrip` guarda
  `trip.route` (id); `markerPosition` respeta `trip.route` con **fallback a
  shortestPath** para viajes viejos/multi-etapa (retrocompatible).
- `worldUI.js`: fila "Ciudad · por \<via\> — costo" (texto `routeVia` + campo `via`);
  el click pasa el **objeto destino completo**. `app.js`: `onSelectDestination` lo recibe
  (el `.find` por cityId elegiría la primera ruta) y `startTrip` recibe `found.route`;
  se quitó el import de `destinationsFrom` que quedó sin uso.
- **Prueba navegador**: filas "Sandquill · por Bahía 76" / "por Bosque 92" (19/23 × 4) y
  la vuelta "Arvandill · por …"; viaje Bahía ida (100→24), vuelta por Bosque con saldo
  parcial ("empezar igual" → Faltan 68 → viaje a mitad de trazo), refund al cancelar,
  viaje Bahía parcial (Faltan 44); **marcador = 0.000% sobre el trazo de la ruta elegida**
  y ~12% de distancia del otro trazo en ambos casos; consola **sin errores ni warnings**;
  test de lógica Node 13/13. Capturas: lista con las 2 filas + mapa con marcador en bahía.
  Navegador del usuario restaurado a su estado previo (solo `world:v1` original).
- Costo Bahía: fórmula `L × k_promedio` (0.0729) = 260.1px × 0.0729 = **19.0** — coincide
  con el plan aprobado. 6 pares grises siguen **DESCARTADOS** (sin ruta directa).

## Estado resumido

- **Completado**: Fase 0 (estructura), Fase 1 (lista de hábitos, 3 estados en 2 toques,
  puntos del día, persistencia) y **Bloque A** (datos y lógica: esquema v2 con
  `{ level, points }` + migración, saldo = Σ − spent, `visibilitychange`,
  doble descripción, world.json con multiplier 4 / dragon 0.3 — todo probado en navegador,
  consola limpia, docs sincronizados 2026-10-29).
- **El trabajo a medio hacer del Bloque A quedó RESUELTO** (habits.json restaurado con
  "pasos", texts.json recortado a `balanceLabel`, SCHEMA_VERSION 2, world.json actualizado).
- **Interacción de hábitos (2026-10-29)**: dos botones directos por hábito
  (Mínimo/Completo) con su descripción debajo, **selección única**, tocar el activo
  desmarca — aprobada por el usuario tras un experimento solo en "Pasos" y extendida a
  los 7 hábitos (`"style": "direct"` en `habits.json`). Detalle en `docs/DECISIONES.md`.
- **Diseño cerrado e implementado (Fase 2 ✓)**: mapa con 6 ciudades, grafo de 9 tramos,
  viaje progresivo automático que consume puntos, 3 acciones por ciudad
  (Viajar/Entrar/Explorar), aventura de dragones con moneda al aire.
  Todo detallado en `docs/DECISIONES.md`.
- **Bloque B — Respaldo COMPLETO (2026-10-30)**: botones Exportar/Importar al final de la
  pantalla; exportación a `habit-quest-backup-AAAA-MM-DD.json` con todas las claves
  `habitQuest:`; importar con validación + **cartel de confirmación propio de la app**
  (decisión del usuario) + aplicación con recarga. Ejecutado en **4 mini-bloques con OK del
  usuario** entre cada uno (protocolo de trabajo nuevo, ver AGENTS.md). Nuevo módulo
  `js/backup.js`. Todo probado; ver `docs/DECISIONES.md`.
- **Bloque C — Recorte de mapa COMPLETO (2026-10-30)**: creado `assets/map/world-map-crop.webp`
  (963×1121, ~110 KB; caja 102,108–1065,1229) desde el original — originales intactos; las
  6 ciudades recalculadas y `"image"` actualizado en `world.json`; verificación visual con
  círculos → **los 6 sobre su ciudad**. Ejecutado en **3 mini-bloques con OK del usuario**.
- **Fase 2 — Mundo/viaje COMPLETA (2026-10-30)**: vista conmutada **"Hoy" ↔ "El camino"**
  (2 botones), mapa recortado con marcador pulsante en la ciudad actual, panel de destino
  con costo real (Dijkstra, camino más corto ×4), **viaje automático estilo Zombie Hikers**
  (todo el saldo fluye solo; "Faltan X"; Cancelar devuelve lo invertido; al llegar
  "Llegaste a…"), **Entrar** (cambia ubicación real) y **Explorar** (40 pts → "Explorada"),
  y **dragones** en Serpent Bay con **moneda al aire en CSS** (prob. 0.3, costo ×2 sobre
  el ya ×4: 212→424). Nuevos módulos `js/world.js` y `js/worldUI.js`. Ejecutado con el
  **protocolo nuevo: mini-bloques sin esperar OK entre ellos**. Probado: toggle, marcador,
  persistencia tras recargar, flujo viajar→llegar→entrar→explorar, Faltan/Cancelar,
  **ambos lados de la moneda** (cara/cruz), consola sin errores, **datos reales del usuario
  restaurados** (13 pts, Arvandill, sin viaje). Ver `docs/DECISIONES.md`.
- **Auditoría M1–M7 COMPLETA (2026-10-30 → 2026-10-31)**: los 7 mini-bloques cerrados
  con bkp en cada sección M de arriba; docs sincronizados (M7). Protocolo nuevo:
  mini-bloques **sin esperar OK** entre ellos (frenar solo ante dudas reales).
- **Waypoints en las 9 rutas + `tools/waypoints.html` (2026-11-01)**: trazos sobre los
  caminos pintados (sección arriba), `arv-stark` probada a full, revisión de rutas hecha
  (las 9 siguen caminos pintados; 6 pares sin ruta directa).
- **Mini-bloque "dos caminos" + 5 rutas mejoradas COMPLETO (2026-11-03)**: **9 rutas** en
  `world.json` (nueva `arv-sand-bay` Bahía 19 pts, `arv-sand` = Bosque 23, 5 waypoints
  reemplazados con costos intactos), `destinationsFrom` con una fila por ruta + `via`,
  `trip.route` con fallback retrocompatible, fila "Ciudad · por X". Probado en navegador:
  ambas rutas ida/vuelta, marcador **0.000% sobre el trazo elegido**, consola limpia,
  capturas. Detalle en la sección "dos caminos" de arriba.
- **Ajustes de rutas + mapa de colores (2026-11-03)**: `sand-stark` eliminada (no
  existe), `vorn-sand` re-trazada con 25 wp del usuario (verificado: sin saltos,
  extremos en las ciudades), reglas de lógica OK (multi-etapa Sandquill→Starkrock ahora
  por Arvandill, 52 pts), app recargada sin errores ni warnings, destinos OK.
  Mapa de referencia generado: `/tmp/opencode/rutas-finales.png` (9 colores + leyenda;
  script `/tmp/opencode/rutas_colores.py`; no toca `assets/map/`).
- **CORTE 2026-11-03 — barrido final + OK del usuario**: docs sincronizados al último
  paso (9 rutas, `sand-stark` eliminada, `vorn-sand` re-trazada, mapa de colores
  generado); sin restos de "NO implementado"/"10 rutas"/"listado de pares" en ningún
  `.md`; `world.json`/`texts.json`/`habits.json` válidos. El usuario aprobó el corte y
  **dio OK para arrancar el roadmap**: 1. ~~Publicar online~~ → 2. App instalable →
  3. Historial → 4. Hitos → 5. Perseguidor (cada uno en mini-bloques con OK).
- **Mini-bloque "Publicar online" COMPLETO (2026-11-03)**: **GitHub Pages en vivo**
  → https://facilestapps-creator.github.io/el-camino-del-heroe/ . Flujo: elegido por el
  usuario (cuenta GitHub propia; también tenía Cloudflare), `git init` rama `main` +
  commit inicial, clave SSH `~/.ssh/id_ed25519` (el usuario la pegó una vez en GitHub),
  repo `facilestapps-creator/el-camino-del-heroe` (público) creado por el usuario,
  push OK (1er intento: error interno transitorio de GitHub → retry OK), Pages
  activado por el usuario (Settings → Pages → main/root). **Verificado en vivo**:
  HTTP 200 con MIME correctos (js/json/css/webp), `world.json` remoto = 9 rutas, app
  navega con **consola limpia** (6 destinos, filas Bahía/Bosque), localStorage OK en el
  dominio, captura tomada. Docs sincronizados (README con URL + cómo publicar,
  ROADMAP "Publicar online ✓", DECISIONES sección "🌐 Publicación"). Pendiente:
  commit/push del sync de docs → **App instalable** (esperando OK/plan).
- **Servidor**: `python3 -m http.server 8000` desde `habit-quest/` (o
  `/tmp/opencode/serve_no_cache.py` en :8000 para pruebas sin caché). Verificar que esté
  vivo antes de probar (puede haber caído entre sesiones).

## Specs de los bloques A / B / C y Fase 2

Completas en `docs/DECISIONES.md` (secciones "Bloques de ajuste" y "Mundo / Mapa").
Resumen:

- **A (datos y lógica)**: `travelCostMultiplier: 4` (aplica a cada camino y a
  explorationCost; doble de dragón sobre costo ya multiplicado) + `dragonProbability: 0.3`;
  guardado por hábito `{ level, points }` con puntos calculados al guardar, `SCHEMA_VERSION`
  2 con migración desde números viejos; saldo = Σ puntos ganados − `spent` (en
  `habitQuest:world:v1`, default 0) mostrado con `texts.balanceLabel`; `visibilitychange`
  anti-bug de medianoche; hábitos muestran `minDesc` y `fullDesc` a la vez.
- **B (respaldo)**: botón Exportar (descarga `habit-quest-backup-YYYY-MM-DD.json` con todas
  las claves `localStorage` que empiecen con `habitQuest:` + fecha + versión de esquema) y
  botón Importar (selector, validación, confirmación explícita, recarga); textos en
  texts.json; botones al final de la pantalla.
- **C (recorte de mapa)**: recortar desde `assets/map/Fantasy World Tutorial Map.webp`
  (2048×1536): x de 5% a 52%, y de 7% a 80% → `assets/map/world-map-crop.webp` calidad ~80
  (sin pisar archivos existentes); recalcular coords de las 6 ciudades con
  `nuevo% = (viejo% × tamaño_original − inicio_recorte) / tamaño_recorte × 100`;
  `image` en world.json → recorte; verificar dibujando círculos sobre cada ciudad y
  reportar el peso.
- **Fase 2 (mundo/viaje)**: estado `world:v1` ampliado (`currentCity`, `visited`,
  `explored`, `trip`); camino más corto con **Dijkstra**; costo = base × `travelCostMultiplier`;
  **viaje automático** (saldo fluye solo hasta completar costo), Cancelar con refund,
  Entrar (fija ubicación) y Explorar (40 pts); dragones solo si el camino pasa por
  Serpent Bay (×2 sobre costo ya ×4) resueltos con **moneda en CSS**. Módulos:
  `js/world.js` (modelo) y `js/worldUI.js` (UI de mapa/panel/moneda).

## Decisiones clave (detalle completo en docs/DECISIONES.md)

- App: **"El camino del héroe"**; inicio en **Arvandill**; ciudad **Dar'Hanok** (con apóstrofo).
- Pasos: **700 pasos = 1 pt**, carga **manual** (la web no lee el podómetro), sin techo diario.
- Viaje **progresivo automático** (todo el saldo fluye solo, estilo Zombie Hikers);
  **Explorar** cuesta 40 pts (10 × multiplier); dragones en la travesía de Serpent Bay con
  prob. 0.3 → costo al doble, **moneda al aire en CSS** (decisión 2026-10-30, sin asset).
- `journey.json` (15 hitos): **diferido**.
- Sin cuentas/servidor/BD; todos los textos y rutas de imágenes en `data/`.

## Entorno

- PIL 10.2.0 disponible (compresión/recorte de imágenes; el agente **sí puede ver imágenes**
  con la herramienta `read`).
- git no está instalado en la máquina; no hay repositorio.
- Fecha de referencia: 2026-11-01.
