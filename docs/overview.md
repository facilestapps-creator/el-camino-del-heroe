# El camino del héroe — overview (memoria viva del proyecto)

> Se lee PRIMERO en cada sesión (después del README) y se actualiza al terminar cada prompt.
> Máximo ~100 líneas: si crece, se resume. Sin datos personales del usuario (el repo es público).
> Última actualización: 2026-11-04 · P1–P4 ✓ (commits y detalle en Historial).

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
`index.html` · `css/` · `js/` (app, backup, config, habits, journey [vacío], storage, text, ui, world, worldUI) · `data/` (habits, journey, stories, texts, world) · `assets/` (mapa: `map/world-map-crop.webp`, 963×1121; los nombres de las ciudades están dibujados en la imagen y son definitivos) · `tools/waypoints.html` (trazador de caminos) · `docs/` · `AGENTS.md` · `README.md`

## Reglas de trabajo
- Un prompt = una tarea. Mini-bloques en orden, sin esperar OK; frenar solo ante dudas reales; probar y reportar.
- Cero textos, nombres o rutas de imagen escritos en el código: todo sale de `data/`.
- No hay backend: la lógica vive en `habits.js` y `world.js`, separada de las pantallas.
- Un dato vive en un solo archivo: README (estructura y arranque) · overview (estado y plan) · ROADMAP (registro de lo hecho) · DECISIONES (diseño y razones) · RECETAS (procedimientos) · AGENTS (reglas del agente).
- Al terminar cada prompt: actualizar overview (Estado, Problemas, Plan, Historial) y, si corresponde, ROADMAP, DECISIONES y README.

## Estado (2026-11-04, tras P4)
**Hecho:** Fase 0–2 (hábitos, enviar, mundo, viaje, dragones, explorar), respaldo, mapa recortado, trazador de caminos, 9 rutas, publicación en GitHub Pages, app instalable, P1 pasos (validación mín/tope), P2 `.gitignore` + reglas de git, P3 documentación (overview reemplaza a MEMORIA), P4 pruebas automáticas de la lógica (34 en `tests/`, cero dependencias).

**Problemas conocidos:**
1. Código: `main()` de app.js de ~290 líneas, `renderAll` con efectos secundarios, acceso a localStorage disperso, rama de hábito "cíclico" muerta, textos con variables armados a mano en el código.
2. Costos de ruta manuales: los píxeles por punto van de 11 a 17, así que el marcador avanza a velocidades distintas según la ruta.

## Plan de trabajo (en este orden)
1. [x] P1 Pasos: campo siempre editable, mínimo = lo ya enviado, tope 30.000. ✓ (2026-11-04, `95160bc`)
2. [x] P2 `.gitignore` y reglas de git. ✓ (2026-11-04, `e151982`)
3. [x] P3 Documentación: este overview reemplaza a MEMORIA.md; AGENTS, README, ROADMAP y DECISIONES sincronizados. ✓ (2026-11-04)
4. [x] P4 Pruebas con `node --test` (Node 18+) en `tests/`. ✓ (2026-11-04 — 34 pruebas, 0 fallas, correr antes de cada push de código)
5. [ ] P5 Refactor en 4 partes: 5a almacenamiento y capas · 5b dividir app.js y separar actualizar de dibujar · 5c código muerto y redundancias · 5d textos con variables.
6. [ ] P6 Costos de ruta derivados del largo del trazado (13,6 px por punto; el total se mantiene en 282), con el tamaño de imagen en `world.json`.
7. [ ] Después: historial · hitos (`journey.json`, diferido) · perseguidor (último). Sin planificar: tienda.

Descartado por ahora: separar la app en `app/` (GitHub Pages desde rama publica solo la raíz).

## Historial
- 2026-11-03: estado inicial verificado (commit ac92283d). Plan P1–P6 definido.
- 2026-11-03: corte de auditoría aprobado por el usuario → OK para arrancar Publicar online (✓) y App instalable (✓).
- 2026-11-04: P1 pasos ✓ (`95160bc`) · P2 `.gitignore` ✓ (`e151982`) · P3 documentación ✓: MEMORIA.md eliminado, secciones movidas (Dudas → DECISIONES, receta → RECETAS), AGENTS con protocolo nuevo, README/ROADMAP/DECISIONES sincronizados.
- 2026-11-04: P4 pruebas automáticas ✓: `package.json` + `tests/` (habits, world, backup, datos + smoke de imports), `node:test`/`assert/strict` sin dependencias, localStorage falso en `tests/helpers/`. 34 pruebas, 34 en verde, 0 todo. Regla: correr antes de cada push de código.
- 2026-11-04: corrección de docs de la auditoría: originales del mapa (no están en el repo; copias `.jpg` en `~/Descargas/`), UI de carga manual de pasos ya hecha, bloqueo de niveles ≠ campo de pasos en Reglas, "app instalable" quitado de pendientes, costo unificado en 13,6 px/pt (RECETAS; medido sobre las 9 rutas: 3.827 px / 282 pts = 13,57).
