# Diseño V2 — zoom del mapa, hábitos propios y Personaje

Fecha: 2026-11-19. Orden de trabajo: **Bloque 2 → Bloque 3 → Bloque 1**.
Estado: decisiones cerradas por el dueño del proyecto. Este documento es la fuente para los encargos a OpenCode.

## Reglas para cada pieza (aplican a todas)

- Una pieza = un commit. Correr `npm test` antes de commitear; no se commitea con pruebas en rojo.
- `localStorage` se toca **solo** desde `js/storage.js`.
- Ningún texto visible va escrito en el código: va en `data/texts.json` (o `data/world.json` donde ya corresponda).
- Todo texto del usuario se muestra con `textContent`, nunca con `innerHTML`.
- Cada clave nueva de `localStorage` lleva prefijo `habitQuest:` y sufijo de versión (`:v1`), así entra sola en el respaldo.
- Al terminar cada pieza: una entrada corta en `docs/DECISIONES.md` y marcar avance en `docs/ROADMAP.md`.
- Antes de tocar nada, leer cómo está resuelta hoy la pestaña "Camino" y seguir el mismo mecanismo.
- No agregar nada que esté en la sección "Fuera de alcance" de cada bloque.

---

## Bloque 2 — Zoom del mapa

**Objetivo:** ver el mapa más de cerca en el celular. Nada más.

**Reglas**
- Pellizco con dos dedos para agrandar y achicar. Zoom mínimo 1x, máximo 2,5x.
- Con el mapa agrandado, un dedo lo desplaza. El mapa no puede salirse de sus bordes.
- Doble toque vuelve a 1x.
- Ciudades, rutas y waypoints se ubican en porcentaje: deben seguir alineados con el mapa al agrandar.
- Viajar, entrar y explorar siguen en los botones de abajo. El mapa no suma funciones.

**Fuera de alcance:** zoom con rueda del mouse, botones +/−, recordar el zoom entre sesiones.

---

## Bloque 3 — Hábitos propios

**Objetivo:** el usuario suma hasta 3 hábitos suyos, con el mismo patrón que los propuestos.

**Reglas**
- Puntos fijos: mínimo = 1, completo = 3. No se le explica ni se le pide al usuario.
- Al crear se pide: **nombre**, **esfuerzo mínimo** (texto) y **esfuerzo completo** (texto). Los dos textos son las descripciones del botón.
- Límites de texto: nombre hasta 30 caracteres, descripciones hasta 40. No se aceptan vacíos.
- Máximo **3 hábitos propios activos**.
- Se pueden editar (nombre y descripciones).
- "Borrar" **archiva**: el hábito deja de mostrarse pero el historial se conserva. Los archivados no cuentan para el tope de 3.
- Viven solo en el navegador: clave `habitQuest:customHabits:v1`. No se toca `data/habits.json`.
- Forma de cada hábito: `{ id: "custom-<n>", label, minDesc, fullDesc, minPoints: 1, fullPoints: 3, style: "direct", archived: false }`.
- Deben entrar en el respaldo (por el prefijo) y la validación al importar debe aceptar y verificar esta clave: lista de hasta 3 activos, textos string, puntos 1 y 3.
- **Verificar antes de implementar** cómo guarda el historial cada día (si es por id de hábito) para que archivar no deje datos huérfanos.

**Fuera de alcance:** cambiar puntos, hábitos tipo "pasos", reordenar hábitos, más de 3.

---

## Bloque 1 — Personaje

**Objetivo:** que explorar ciudades tenga premio visual. Todo es estético: sin bonus de puntos, sin poderes, sin combate.

### Piezas y casilleros
6 casilleros, uno por tipo: `casco`, `armadura`, `brazaletes`, `hombreras`, `pantalones`, `calzado`.

### Catálogo: `data/items.json`
```json
{
  "slots": [
    { "id": "casco", "label": "Casco" }
  ],
  "items": [
    { "id": "casco-01", "slot": "casco", "name": "Casco 1", "image": null }
  ]
}
```
- Arranca con 2 piezas de ejemplo por casillero (12 en total), con `image: null`.
- Sin imagen, la pieza se dibuja como un cuadrado de color con su nombre. Cuando haya arte, se cambia `image` por la ruta (por ejemplo `assets/items/casco-01.webp`) sin tocar código.
- Agregar una prueba en `tests/data.test.js`: cada pieza apunta a un casillero que existe y los ids no se repiten.

### Estado: `habitQuest:character:v1`
```json
{ "equipped": { "casco": null, "armadura": null }, "offer": null }
```
- `equipped`: id de la pieza puesta por casillero, o `null`.
- `offer`: `{ "cityId": "...", "itemIds": ["..."] }` o `null`. Es lo que se ofreció en la estadía actual.

### Reglas de juego
1. **Explorar** ciudad cuesta lo mismo que hoy (10 puntos) y genera la oferta de esa estadía: de **1 a 3 piezas** al azar (siempre al menos una).
2. La "bolsa general" son todas las piezas del catálogo que **no** están puestas ni en la oferta actual. Las ofertas salen de ahí.
3. Volver a explorar en la misma ciudad (misma estadía) muestra **la misma oferta, sin cobrar de nuevo**. El botón pasa a "Ver objetos".
4. El usuario elige una pieza de la oferta y se la pone. Si ese casillero estaba ocupado, la pieza anterior vuelve a la bolsa general. La pieza elegida sale de la oferta.
5. Al **llegar a otra ciudad**, `offer` se borra. Lo que no se eligió vuelve a la bolsa.
6. Hay **dos caminos** que exploran y ambos deben generar la oferta: el botón Explorar dentro de la ciudad y la opción "Viajar, entrar y explorar" (hoy se resuelve en `js/world.js`, donde se agrega la ciudad a `explored`).
7. Las historias de cada ciudad siguen funcionando como hoy: se muestran una vez que la ciudad fue explorada alguna vez (`explored` sigue siendo el historial permanente). Lo que cambia es que **explorar ya no se bloquea para siempre**: se puede explorar de nuevo en una estadía posterior.
8. Si el usuario toma todas las piezas de la oferta, el botón queda en "Ver objetos" y muestra que ya no quedan.

### Pestaña "Personaje" (tercera, como "Camino")
- Una figura simple, sin sexo, y alrededor los 6 casilleros cuadrados. Distribución sugerida: casco arriba; hombreras y brazaletes a los lados; armadura al centro; pantalones debajo; calzado abajo.
- Cada casillero muestra la pieza puesta (imagen o cuadrado de color con nombre) o, vacío, su etiqueta atenuada.
- La figura **no cambia de dibujo** al ponerse piezas. Solo se ven las piezas en sus casilleros.

### Respaldo
- `habitQuest:character:v1` entra por el prefijo. La validación al importar debe verificar: `equipped` con valores string o null y `offer` null u objeto con `cityId` string e `itemIds` array.

**Fuera de alcance:** baúl, arrastrar, sacarse piezas, colección, rareza, bonus, dibujo del personaje en capas.

---

## Piezas de trabajo (en este orden)

1. **Zoom del mapa** (Bloque 2 completo).
2. **Hábitos propios: lógica y datos** — clave `customHabits`, crear/editar/archivar, tope de 3, validación de respaldo, pruebas. Sin pantalla.
3. **Hábitos propios: pantalla** — formulario de creación y edición, botón de archivar, textos en `texts.json`.
4. **Personaje: catálogo, estado y reglas** — `items.json`, clave `character`, generación de oferta, equipar, reseteo al cambiar de ciudad, validación de respaldo, pruebas. Sin pantalla.
5. **Explorar muestra piezas** — la oferta aparece en el bloque de la ciudad, con botón "Ponerme"; los dos caminos de explorar; botón "Ver objetos".
6. **Pestaña Personaje** — figura y 6 casilleros.

## Pendientes de contenido (de Lucho, no de OpenCode)
- Historias de las 6 ciudades en `data/stories.json`.
- Nombres definitivos y arte de las piezas (`data/items.json` + `assets/items/`).
- Nombres y descripciones de los 15 hitos de `data/journey.json`.
