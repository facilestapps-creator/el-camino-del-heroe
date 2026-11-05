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

## Correr las pruebas

Requiere **Node 18 o superior**. Desde `habit-quest/`:

```bash
npm test
```

Equivalente sin npm: `node --test tests/` (es el comando exacto que ejecuta el
script `test` de `package.json`). Cubren solo lógica (habits, world, backup y
`data/`); no tocan DOM ni pantallas.

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
├── package.json            (ES modules + script "test" de Node)
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js              (orquestador: session + refresh() = actualizar + dibujar)
│   ├── backup.js
│   ├── backupFlow.js       (flujo de respaldo: exportar/importar + línea "último respaldo")
│   ├── config.js           (claves, versiones y STORAGE_PREFIX)
│   ├── dataFiles.js        (lectura de data/*.json — único módulo con fetch)
│   ├── habits.js
│   ├── habitsFlow.js       (flujo de hábitos: tap por nivel, pasos, Enviar)
│   ├── journey.js
│   ├── storage.js          (ÚNICO módulo que toca localStorage)
│   ├── text.js             (textOf + fillText para plantillas {var})
│   ├── ui.js
│   ├── world.js
│   ├── worldFlow.js        (flujo del mundo: destino, viaje, dragón, explorar)
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
├── tests/                  (pruebas automáticas de la lógica — npm test)
│   ├── helpers/
│   │   └── localStorage.js (localStorage falso en memoria, se reinicia por prueba)
│   ├── imports.test.js     (todos los módulos salvo app.js importan sin error en Node)
│   ├── habits.test.js
│   ├── world.test.js
│   ├── backup.test.js
│   └── data.test.js        (integridad de world/stories/habits.json)
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
