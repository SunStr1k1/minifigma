/**
 * Единый язык проекта.
 *
 * Здесь описаны сущности, которыми обмениваются все остальные слои:
 * constants → utils → hooks → components. TypeScript проверяет,
 * что все файлы говорят об одних и тех же сущностях одинаково,
 * и ловит ошибки до запуска приложения.
 */

/** Точка в системе координат канваса (мировые координаты). */
export interface Point {
  x: number;
  y: number;
}

/** Размер в мировых координатах (независим от зума). */
export interface Size {
  width: number;
  height: number;
}

/** Прямоугольная область: левый верхний угол + размер. */
export interface Rect extends Point, Size {}

/**
 * Камера видимой области канваса.
 * Связь мировых и экранных координат:
 * screen = world * zoom + offset
 */
export interface Viewport {
  /** Сдвиг камеры в экранных пикселях: здесь рисуется мировая точка (0, 0). */
  offsetX: number;
  offsetY: number;
  /** Масштаб: 1 = 100%. */
  zoom: number;
}

/** Инструменты панели: выделение и два инструмента рисования. */
export type Tool = 'select' | 'rectangle' | 'ellipse';

/** Тип фигуры на канвасе — всё, кроме инструмента выделения. */
export type ShapeKind = Exclude<Tool, 'select'>;

/** Фигура на канвасе. Координаты — мировые (учитывают зум и панорамирование). */
export interface Shape extends Rect {
  id: string;
  kind: ShapeKind;
  /** Имя слоя в панели «Слои». */
  name: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Прозрачность от 0 до 1. */
  opacity: number;
}

/** Данные новой фигуры ещё без id — так удобно вызывать addShape(). */
export type ShapeDraft = Omit<Shape, 'id'>;
