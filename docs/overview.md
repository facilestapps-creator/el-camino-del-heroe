# El camino del héroe — overview (memoria viva del proyecto)

> Se lee PRIMERO en cada sesión (después del README) y se actualiza al terminar cada prompt.
> Máximo ~100 líneas: si crece, se resume. Sin datos personales del usuario (el repo es público).
> Última actualización: 2026-11-05 · P1–P6 ✓ y A ✓ (commits y detalle en Historial).

## Qué es
App web personal para llevar hábitos con mecánica de juego. Cada hábito tiene nivel mínimo o completo; los puntos ganados se gastan para viajar y explorar un mapa de fantasía. Un solo usuario, sin cuentas ni servidor. Título provisorio: "El camino del héroe" (carpeta/paquete: habit-quest).

## Stack y publicación
- HTML + CSS + JavaScript puro (módulos ES). Sin frameworks, sin backend, sin dependencias.
- Datos del usuario: solo en el localStorage del navegador (claves `habitQuest:data:v1`, `habitQuest:world:v1`, `habitQuest:meta:v1`). Nunca se suben al repo.
- Repo público: github.com/facilestapps-creator/el-camino-del-heroe (rama `main`).
- Hosting: GitHub Pages, deploy automático en cada push: https://facilestapps-creator.github.io/el-camino-del-heroe/
- Local: servidor estático desde la raíz (`python3 -m http.server 8000`). Abrir el HTML con doble clic no funciona.

## Reglas de juego vigentes
- Hábitos (7): ejercicio, desayuno, almuerzo, cena, lectura y agua (mínimo = 1 pt, completo = 3 pts) y pasos (ingreso manual del total del día, 700 pasos = 1 pt).
- Enviar: lo marcado queda "pendiente"; al tocar Enviar pasa a la bolsa y los **niveles** del día quedan bloqueados (el campo de pasos sigue siempre editable). Disponible = puntos enviados − puntos gastados. Los pendientes de días anteriores se envían solos.
- Mundo: 6 ciudades (Arvandill de inicio, Vornstead, Dar'Hanok, Sandquill, Starkrock, Western Glades) y 9 rutas (dos a Sandquill: Bosque y Bahía). Costos ×4 (`travelCostMultiplier`); explorar una ciudad cuesta 10 × 4.
- Viajar: los puntos enviados fluyen al viaje a medida que llegan; cancelar devuelve lo invertido. Si no alcanzan, se pide confirmación para empezar igual. Explorar solo con el costo completo.
- Dragones: el tramo Western Glades–Starkrock tiene 30 % de duplicar el costo. La moneda se guarda por tramo (no se puede re-tirar) y se borra al entrar a una ciudad.
- Historia: un texto corto por ciudad en `data/stories.json` (placeholders; los escribe el usuario).
- Respaldo: exportar/importar JSON con validación; muestra "último respaldo".

## Estructura (raíz del repo)
`index.html` · `css/` · `js/` (app [orquestador: session + refresh], backup, backupFlow, config, dataFiles, habits, habitsFlow, journey [vacío], storage, text, ui, world, worldFlow, worldUI) · `data/` (habits, journey, stories, texts, world) · `assets/` (mapa: `map/world-map-crop.webp`, 963×1121; los nombres de las ciudades están dibujados en la imagen y son definitivos) · `tools/waypoints.html` (trazador de caminos) · `docs/` · `AGENTS.md` · `README.md`

## Reglas de trabajo
- Un prompt = una tarea. Mini-bloques en orden, sin esperar OK; frenar solo ante dudas reales; probar y reportar.
- Cero textos, nombres o rutas de imagen escritos en el código: todo sale de `data/`.
- No hay backend: la lógica vive en `habits.js` y `world.js`, separada de las pantallas.
- Un dato vive en un solo archivo: README (estructura y arranque) · overview (estado y plan) · ROADMAP (registro de lo hecho) · DECISIONES (diseño y razones) · RECETAS (procedimientos) · AGENTS (reglas del agente).
- Al terminar cada prompt: actualizar overview (Estado, Problemas, Plan, Historial) y, si corresponde, ROADMAP, DECISIONES y README.

## Estado (2026-11-05, tras P6)
**Hecho:** Fase 0–2 (hábitos, enviar, mundo, viaje, dragones, explorar), respaldo, mapa recortado, trazador de caminos, 9 rutas, publicación en GitHub Pages, app instalable, P1 pasos (validación mín/tope), P2 `.gitignore` + reglas de git, P3 documentación (overview reemplaza a MEMORIA), P4 pruebas automáticas de la lógica (37 en `tests/`, cero dependencias), **P5 refactor** (capas: storage/dataFiles, app.js = orquestador con `refresh()` y flujos separados, código muerto eliminado, textos con variables en `data/` — ver DECISIONES «Capas del código»), **P6 costos de ruta** (points = `round(largo_px ÷ 13,6)` derivado de los waypoints al cargar; `imageSize` y `pxPerPoint` en `world.json`; total 282; el marcador avanza a velocidad pareja en todas las rutas), **A limpieza rápida** (test portable, respaldo aislado por prefijo, costos con fallo fuerte, CSS y comentarios limpios; 44 pruebas).

**Problemas conocidos (prompt B, pendiente hasta después de una semana de uso real):**
1. **Persistencia dentro de la lógica**: `habits.js` llama `saveDays` en 4 funciones (`saveTodayLevel`, `saveSteps`, `sendDay`, `migrateDaysData`). Además `session.levelsByHabit` se sincroniza a mano en 5 lugares y su nombre engaña (guarda entradas completas, no niveles; `getTodayLevels` igual).
2. **Formato viejo repetido**: `typeof x === 'object' && x !== null` aparece 9 veces (habits 7, backup 1, ui 1) más funciones de compatibilidad que ya no se ejecutan (`getLevelValue` numérico, fallbacks en `computeDayPoints` y `computeTotalSent`). Constantes 700 y 30000 duplicadas como valor de reserva en app.js (ya están en habits.json) y 2500/5000 en la migración.
3. **Textos**: 21 accesos directos a `textsBag`/`worldTexts` sin `textOf` (app.js 4, backupFlow.js 5, worldUI.js 12); con una clave faltante se vería "undefined".
4. **Menores**: `panelHandlers` se usa en `renderAll` antes de definirse; la secuencia migrar + enviar días viejos está duplicada (arranque y `visibilitychange`); `showConfirm('', …)` con mensaje vacío; `backup.js` importa `getTodayKey` desde `habits.js`.
5. **El trazador** (`tools/waypoints.html`) no muestra el costo resultante de la ruta.

## Plan de trabajo (en este orden)
1. [x] P1 Pasos: campo siempre editable, mínimo = lo ya enviado, tope 30.000. ✓ (2026-11-04, `95160bc`)
2. [x] P2 `.gitignore` y reglas de git. ✓ (2026-11-04, `e151982`)
3. [x] P3 Documentación: este overview reemplaza a MEMORIA.md; AGENTS, README, ROADMAP y DECISIONES sincronizados. ✓ (2026-11-04)
4. [x] P4 Pruebas con `node --test` (Node 18+) en `tests/`. ✓ (2026-11-04 — 34 pruebas, 0 fallas, correr antes de cada push de código)
5. [x] P5 Refactor en 4 partes: 5a almacenamiento y capas · 5b dividir app.js y separar actualizar de dibujar · 5c código muerto y redundancias · 5d textos con variables. ✓ (2026-11-04 — `f33d4ec`, `52cd24b`, `7e86aba`, `b1b4bb6`; 35 pruebas verdes; push tras el smoke final en navegador)
6. [x] P6 Costos de ruta derivados del largo del trazado (13,6 px por punto; el total se mantiene en 282), con el tamaño de imagen en `world.json`. ✓ (2026-11-05 — `hydrateRouteCosts` en world.js, `imageSize`+`pxPerPoint` en world.json, 37 pruebas, smoke en navegador con consola limpia)
7. [x] A Limpieza rápida: script de test portable, respaldo que solo escribe claves del juego, costos que fallan fuerte, CSS muerto, comentarios sin historial y docs. ✓ (2026-11-05 — 44 pruebas)
8. [ ] **Semana de uso real (usuario)**: usar la app una semana antes de tocar estructura.
9. [ ] **B: estructura y textos (después de la semana)**: resolver la lista de "Problemas conocidos".
10. [ ] Después: historial · hitos (`journey.json`, diferido) · perseguidor (último). Sin planificar: tienda.

Descartado por ahora: separar la app en `app/` (GitHub Pages desde rama publica solo la raíz).

## Historial
- 2026-11-03: estado inicial verificado (commit ac92283d). Plan P1–P6 definido.
- 2026-11-03: corte de auditoría aprobado por el usuario → OK para arrancar Publicar online (✓) y App instalable (✓).
- 2026-11-04: P1 pasos ✓ (`95160bc`) · P2 `.gitignore` ✓ (`e151982`) · P3 documentación ✓: MEMORIA.md eliminado, secciones movidas (Dudas → DECISIONES, receta → RECETAS), AGENTS con protocolo nuevo, README/ROADMAP/DECISIONES sincronizados.
- 2026-11-04: P4 pruebas automáticas ✓: `package.json` + `tests/` (habits, world, backup, datos + smoke de imports), `node:test`/`assert/strict` sin dependencias, localStorage falso en `tests/helpers/`. 34 pruebas, 34 en verde, 0 todo. Regla: correr antes de cada push de código.
- 2026-11-04: corrección de docs de la auditoría: originales del mapa (no están en el repo; copias `.jpg` en `~/Descargas/`), UI de carga manual de pasos ya hecha, bloqueo de niveles ≠ campo de pasos en Reglas, "app instalable" quitado de pendientes, costo unificado en 13,6 px/pt (RECETAS; medido sobre las 9 rutas: 3.827 px / 282 pts = 13,57).
- 2026-11-04: **P5 refactor ✓ en 4 mini-bloques**: 5a (`f33d4ec`) localStorage solo en storage.js, fetch en dataFiles.js, prefijo en config · 5b (`52cd24b`) app.js = orquestador con `session` y `refresh() = updateState() + renderAll()`, flujos en habitsFlow/worldFlow/backupFlow · 5c (`7e86aba`) rama cíclica, lockedTag/disabled inalcanzables, getLevelOf duplicado y textos huérfanos eliminados (test de estilos nuevos) · 5d (`b1b4bb6`) 14 plantillas `{var}` en `data/` + `fillText` (verificado: claves completas y 16/16 strings idénticos). 35 pruebas en verde. **Smoke 5d en navegador ✓** (2026-11-05): todos los textos con variables verificados en pantalla (Estás en/Viajando/Faltan/Llegaste/Entrar/Explorar · 40/dos caminos/212 · ¡Dragones!/Enviar (N)/+N pendientes/Disponible/700 pasos) + diálogos (2 opciones, sin saldo, cancelar con reembolso) + consola sin errores ni warnings; datos del usuario restaurados tras el smoke. Cierre: push único de los 5 commits.
- 2026-11-05: **P6 costos de ruta ✓**: los 9 routes perdieron el `points` manual; al cargar, `hydrateRouteCosts` calcula `points = round(largo_px ÷ 13,6)` desde los waypoints con `imageSize` (963×1121) y `pxPerPoint` (13,6) ahora en `world.json`; **Σ = 282 exacto** (3.827 px medidos); el marcador pasa a la misma longitud en px (desaparece el 0,859 hardcodeado). Costos en pantalla (×4): Vornstead 68 · WGlades 140 · Dar'Hanok 160 · Bahía 76 (igual) · Bosque 116 · Starkrock 144 · dragón 188. 37/37 pruebas (2 nuevas); smoke en navegador en `127.0.0.1` (la caché de localhost servía world.json viejo): filas, dragón, diálogos y consola limpia; el viaje a mitad de camino del usuario restaurado byte a byte.
- 2026-11-05: **A limpieza rápida ✓**: script de test portable (`node --test` sin argumentos, helpers no corren como prueba), `replaceByPrefix` escribe solo claves del juego (+3 pruebas), `hydrateRouteCosts` falla fuerte con Error si falta `imageSize`/`pxPerPoint` o la ruta nombra una ciudad inexistente (+4 pruebas), `.habit-desc`/`.habit-desc-full` eliminadas del CSS, ~54 comentarios de historial reescritos como porqué (grep de tags vacío) y "Problemas conocidos" = lista del prompt B. 44 pruebas verdes.
