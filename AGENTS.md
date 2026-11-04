# AGENTS.md — Instrucciones del proyecto "El camino del héroe"

App web personal de hábitos con mecánica de juego (estilo Habitica + mapa tipo
Zombie Hikers, sin persecución). Leé esto antes de tocar cualquier cosa.

## Principio: un dato vive en un solo archivo

- `README.md` = estructura y arranque.
- `docs/overview.md` = estado, problemas conocidos y plan.
- `docs/ROADMAP.md` = registro de lo hecho.
- `docs/DECISIONES.md` = diseño y razones.
- `docs/RECETAS.md` = procedimientos.
- `AGENTS.md` (este archivo) = reglas del agente.

## Protocolo de trabajo

- **Un prompt = una tarea.**
- Mini-bloques **en orden, sin esperar OK** entre ellos.
- **Frenar solo ante dudas reales** (si un requisito no está claro o falta información,
  preguntar antes de seguir).
- **Al terminar, reportar qué se hizo y qué se probó.**
- **Al terminar cada prompt, actualizar `docs/overview.md`** (Estado, Problemas
  conocidos, Plan, Historial) **y, si corresponde, `ROADMAP.md`, `DECISIONES.md` y
  `README.md`.**

## Cómo continuar (obligatorio)

1. Orden de lectura: `README.md` → `docs/overview.md` → `docs/ROADMAP.md` →
   `docs/DECISIONES.md` (`docs/RECETAS.md` cuando se tracen caminos).
2. Trabajar de a **una tarea por prompt**: implementar → probar en el navegador →
   reportar qué se probó.
3. Código y docs nunca desfasados.
4. No agregar funciones que no se pidan.
5. **No borrar archivos de `assets/` sin permiso del usuario** (va a agregar su propio
   arte).

## Reglas técnicas

- HTML/CSS/JS puros con ES modules. Sin frameworks ni librerías.
- Cero strings y cero rutas de imágenes hardcodeados en el código: todo texto, nombre
  y ruta viene de los archivos de `data/`.
- Sin cuentas, sin servidor propio, sin base de datos: `localStorage`
  (`habitQuest:data:v1` y `habitQuest:world:v1`).
- Mobile-first, pantalla única, 3 estados por hábito (nada/mínimo/completo), máximo 2 toques.
- Para probar: `python3 -m http.server 8000` desde `habit-quest/` → http://localhost:8000
  (los ES modules no funcionan abriendo el archivo con file://). Verificar que el
  servidor esté vivo antes de probar (puede haber caído entre sesiones).
- PIL disponible para imágenes (compresión/recorte); el agente **sí puede ver imágenes**
  con la herramienta `read`.

## Git y publicación

- **Commit al terminar cada prompt**, con mensaje `"P<n>: <resumen>"`.
- **Cada push publica la app EN VIVO** (GitHub Pages). No pushear cambios de código si
  `npm test` falla (cuando existan las pruebas) **ni si hay errores en la consola del
  navegador**. Los cambios **solo de documentación** se pueden pushear.
- **Antes de que existan pruebas**: pushear código solo si el usuario lo pide.
- **Nunca** subir respaldos ni datos del usuario. **Nunca** `push --force` ni reescribir
  historial.
- Si algo se rompe en vivo: `git revert` del commit y push.
