import type { Point, Rect, Viewport } from '../types/shape';

/** Зум колесом: от 10% до 400%. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Экранные координаты (курсор относительно канваса) → мировые координаты.
 *
 * Из screen = world * zoom + offset выражаем world:
 * world = (screen - offset) / zoom
 *
 * Без этого пересчёта фигуры «уезжают» относительно курсора при зуме и сдвиге холста.
 */
export function screenToCanvas(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.zoom,
    y: (point.y - viewport.offsetY) / viewport.zoom,
  };
}

/** Мировые координаты → экранные (обратная операция). */
export function canvasToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.offsetX,
    y: point.y * viewport.zoom + viewport.offsetY,
  };
}

/**
 * Новый вьюпорт при зуме вокруг якорной точки (обычно — позиция курсора).
 * Мировая точка под якорем остаётся на месте, меняется только масштаб.
 */
export function zoomAt(viewport: Viewport, anchor: Point, nextZoom: number): Viewport {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const world = screenToCanvas(anchor, viewport);
  return {
    zoom,
    offsetX: anchor.x - world.x * zoom,
    offsetY: anchor.y - world.y * zoom,
  };
}

/** Сдвиг камеры на экранные пиксели (панорамирование). */
export function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    offsetX: viewport.offsetX + dx,
    offsetY: viewport.offsetY + dy,
  };
}

/**
 * Прямоугольник по двум точкам перетаскивания (мировые координаты).
 * Фигуру можно растягивать в любую сторону, поэтому нормируем углы:
 * x/y — всегда левый верхний угол, width/height — неотрицательные.
 */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/**
 * Новое положение перетаскиваемой фигуры.
 *
 * start — где фигура была при захвате, grab — где курсор её схватил,
 * current — где курсор сейчас. Смещение курсора (current − grab) прикладываем
 * к start, поэтому фигура «держится» под той же точкой, за которую её взяли,
 * и не прыгает углом к курсору.
 */
export function dragTo(start: Point, grab: Point, current: Point): Point {
  return {
    x: start.x + (current.x - grab.x),
    y: start.y + (current.y - grab.y),
  };
}
