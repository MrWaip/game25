### Цель

Развести понятия **world-units** (симуляция/геймплей) и **pixels** (рендер), чтобы:

- не было “мыла” на широких/retina экранах
- изменение размера окна/экрана не меняло дистанции/скорости/ощущения в игре
- потребитель игры мог настраивать поведение (aspect strategy, “сколько мира видно”, лимиты DPR), не ломая ECS

---

### Терминология “как в движках”

Нужно разделить минимум 4 независимых величины. В терминах, близких к Unity/Unreal, это раскладывается на **`Screen`** и **`Camera`**:

- **`Screen.size`**
  - Что это: размер окна/контейнера в layout‑пикселях (CSS pixels).
  - Откуда берётся: DOM layout (`clientWidth/clientHeight`) или `window.innerWidth/innerHeight`.
  - Кто владеет: платформа.

- **`Screen.pixelRatio`**
  - Что это: коэффициент между layout‑пикселями и physical pixels (аналог DPR).
  - Откуда берётся: `window.devicePixelRatio`, иногда ограничивается сверху ради производительности.
  - Кто владеет: платформа/рендер.

- **`Screen.bufferSize`**
  - Что это: размер backbuffer/render target в physical pixels (для web: `canvas.width/height`).
  - Формула: `Screen.bufferSize = Screen.size * Screen.pixelRatio`.
  - Кто владеет: renderer.

- **`Camera.orthographicSize`**
  - Что это: базовый масштаб ортографической камеры (в world‑units), как в Unity: **половина высоты видимой области**.
  - Это не “разрешение”. Это параметр **камеры/дизайна**.
  - Кто владеет: ECS (компонент камеры).

Дополнительно (опционально, но полезно):

- **`Camera.zoom`**
  - Что это: множитель к базовому масштабу (безразмерный).
  - Пример: 1 = default, 2 = крупнее (видно меньше мира), 0.5 = дальше (видно больше мира).

- **`Camera.aspect`**
  - Что это: соотношение сторон окна/буфера (ширина/высота). Обычно вычисляется из `Screen.size` (или `Screen.bufferSize`, если нужно учитывать “пиксельную” математику).
  - Используется, чтобы из `Camera.orthographicSize` получить фактическую ширину видимой области.

---

### Как это называют “в индустрии”

У разных движков разный API, но смыслы одни и те же:

- `Screen`:
  - Unity: `Screen.width/Screen.height`, `Screen.SetResolution(...)`, quality settings (resolution scale)
  - Unreal: viewport/backbuffer size, screen percentage / resolution scale
  - общий термин: backbuffer size / render target size / output resolution

- `Camera`:
  - Unity 2D: `Camera.orthographicSize` + aspect
  - Unreal: Camera + (обычно) FOV/проекция; для 2D аналогичен orthographic размер
  - общий термин: view size (world units), orthographic size, view frustum

- `Screen.size`:
  - web-терминология: CSS pixel size / layout size

