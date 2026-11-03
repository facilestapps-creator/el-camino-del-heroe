# AGENTS.md — Instrucciones del proyecto "El camino del héroe"

App web personal de hábitos con mecánica de juego (estilo Habitica + mapa tipo
Zombie Hikers, sin persecución). Leé esto antes de tocar cualquier cosa.

## Regla de oro (2026-10-29)

El agente es **desarrollador y asesor**: las recomendaciones son bienvenidas, pero hay
que **chequear con el usuario antes de empezar CUALQUIER cosa** — una línea de código,
un cambio, un archivo, un bloque nuevo. **Nada se empieza sin visto bueno explícito.**

**Protocolo de trabajo (2026-10-30)**: ante una indicación → ① leerla **entera** →
② revisar si surgen dudas/obstáculos y **preguntar** → ③ ajustar el plan → ④ recién ahí
accionar. Los bloques grandes se dividen en **mini-bloques**: al terminar cada uno,
**resumen + esperar el OK** para el siguiente. Si surge una duda a mitad, **frenar y
preguntar** antes de continuar.

## Cómo continuar (obligatorio)

1. Leer en este orden: `docs/MEMORIA.md` (estado completo y trabajo a medio hacer) →
   `docs/ROADMAP.md` (qué fase/bloque sigue) → `docs/DECISIONES.md` (decisiones de
   diseño y specs de los bloques A/B/C) → `README.md` (estructura real).
2. Trabajar de a **UN bloque o fase por vez**: implementar → probar en el navegador →
   reportar qué se probó → **DETENERSE** y esperar.
3. Después de cada bloque/fase sincronizar la documentación: `README.md` (estructura),
   `docs/ROADMAP.md` (estado), `docs/DECISIONES.md` (decisiones nuevas).
   **Código y docs nunca desfasados.**
4. No agregar funciones que no se pidan.
5. Nunca borrar ni pisar archivos de `assets/map/`.

## Reglas técnicas

- HTML/CSS/JS puros con ES modules. Sin frameworks ni librerías.
- Cero strings y cero rutas de imágenes hardcodeados en el código: todo texto, nombre
  y ruta viene de los archivos de `data/`.
- Sin cuentas, sin servidor propio, sin base de datos: `localStorage`
  (`habitQuest:data:v1` y `habitQuest:world:v1`).
- Mobile-first, pantalla única, 3 estados por hábito (nada/mínimo/completo), máximo 2 toques.
- Para probar: `python3 -m http.server 8000` desde `habit-quest/` → http://localhost:8000
  (los ES modules no funcionan abriendo el archivo con file://).

## Orden de fases

Fase 0 ✓ · Fase 1 ✓ · Bloque A ✓ (datos y lógica) · Interacción de hábitos ✓
(botones directos) · Bloque B ✓ (respaldo) · Bloque C ✓ (recorte de mapa) ·
Fase 2 ✓ (mundo/viaje) · Historial · App instalable · Hitos (journey.json, diferido) ·
Perseguidor (último).

Estado real y detalle: `docs/ROADMAP.md`.
