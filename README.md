# Habit Quest

App web personal de habitos con mecanica de juego.

- Uso personal, sin cuentas, sin servidor propio y sin base de datos.
- Datos guardados en el navegador (localStorage).
- Diseno pensado para uso desde el celular.

## Levantar el servidor local

```bash
python3 -m http.server 8000
```

Luego abrir en el navegador: http://localhost:8000

## Estado y documentación

- **Estado actual, problemas conocidos y plan**: [`docs/overview.md`](docs/overview.md)
  (se lee primero en cada sesión).
- `tools/waypoints.html`: herramienta para trazar rutas sobre el mapa (clics con zoom/pan,
  devuelve el JSON de waypoints para pegar en `world.json`).

## Publicación

- **En vivo**: https://facilestapps-creator.github.io/el-camino-del-heroe/
- Hosting: **GitHub Pages** (repo: `github.com/facilestapps-creator/el-camino-del-heroe`,
  rama `main`, deploy automático en cada push).
- Para publicar cambios: `git add -A && git commit -m "msg" && git push` (SSH ya
  configurado en esta máquina).

## Estructura

```
habit-quest/
├── AGENTS.md
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── backup.js
│   ├── config.js
│   ├── storage.js
│   ├── habits.js
│   ├── journey.js
│   ├── text.js
│   ├── ui.js
│   ├── world.js
│   └── worldUI.js
├── data/
│   ├── texts.json
│   ├── habits.json
│   ├── journey.json
│   ├── stories.json
│   ├── world.json
│   └── manifest.json       (app instalable: nombre, íconos, display)
├── tools/
│   └── waypoints.html      (trazador de rutas sobre el mapa → JSON de waypoints)
├── assets/
│   ├── icons/              (app instalable: icon-192, icon-512, maskable, apple-touch)
│   ├── characters/       (.gitkeep)
│   └── map/
│       ├── .gitkeep
│       └── world-map-crop.webp              (recorte isla 963×1121, 110 KB)
└── docs/
    ├── overview.md         (estado, problemas conocidos y plan — memoria única)
    ├── ROADMAP.md
    ├── DECISIONES.md
    └── RECETAS.md          (procedimientos reutilizables)
```
