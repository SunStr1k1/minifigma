import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Shape as ShapeModel, ShapeDraft } from '../types/shape';

/** Отступ рамки выделения от фигуры и размер маркеров — в экранных пикселях. */
const SELECTION_PADDING = 4;
const HANDLE_SIZE = 8;
const SELECTION_COLOR = '#2563eb';

interface ShapeProps {
  /** Готовая фигура или черновик, который ещё тянется мышью по холсту. */
  shape: ShapeModel | ShapeDraft;
  selected: boolean;
  /**
   * Зум канваса. Рамка и маркеры не должны расти вместе с фигурой,
   * поэтому их мировые размеры делим на зум — на экране они постоянны.
   */
  zoom: number;
  /** Инструмент выделения активен: над фигурой показываем курсор «перемещение». */
  movable?: boolean;
  /** Клик по фигуре. Остановите всплытие, чтобы не сбрасывать выделение на канвасе. */
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
}

/**
 * Рендер одной фигуры в мировых координатах.
 * Зум и панорамирование применяет родительский <g transform="..."> в Canvas,
 * поэтому здесь ничего не пересчитывается.
 */
export function Shape({ shape, selected, zoom, movable = false, onPointerDown }: ShapeProps) {
  const { kind, x, y, width, height, fill, stroke, strokeWidth, opacity } = shape;

  // Фигура и обводка рисуются одинаково на любом зуме.
  const shared = {
    fill,
    stroke,
    strokeWidth,
    opacity,
    vectorEffect: 'non-scaling-stroke' as const,
    style: movable ? { cursor: 'move' as const } : undefined,
    onPointerDown,
  };

  // 1 / zoom превращает экранные пиксели в мировые в любом месте холста.
  const inv = 1 / (zoom || 1);
  const padding = SELECTION_PADDING * inv;
  const handleSize = HANDLE_SIZE * inv;

  // Четыре угла и четыре середины сторон вокруг рамки выделения.
  const half = handleSize / 2;
  const handlePoints: Array<[number, number]> = [
    [x, y],
    [x + width / 2, y],
    [x + width, y],
    [x + width, y + height / 2],
    [x + width, y + height],
    [x + width / 2, y + height],
    [x, y + height],
    [x, y + height / 2],
  ];

  return (
    <g>
      {kind === 'rectangle' ? (
        <rect x={x} y={y} width={width} height={height} rx={4} {...shared} />
      ) : (
        <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} {...shared} />
      )}

      {selected && (
        // Рамка и маркеры — только визуал: pointerEvents="none" не мешает тащить фигуру.
        <g pointerEvents="none">
          <rect
            x={x - padding}
            y={y - padding}
            width={width + padding * 2}
            height={height + padding * 2}
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {handlePoints.map(([hx, hy], index) => (
            <rect
              key={index}
              x={hx - half}
              y={hy - half}
              width={handleSize}
              height={handleSize}
              fill="#ffffff"
              stroke={SELECTION_COLOR}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}
    </g>
  );
}
