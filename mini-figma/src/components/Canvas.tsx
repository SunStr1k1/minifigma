import { useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useViewport } from '../hooks/useViewport';
import { screenToCanvas } from '../utils/geometry';
import type { Point, Shape as ShapeModel, ShapeDraft, ShapeKind, Tool } from '../types/shape';
import { Shape } from './Shape';

/** Шаг сетки в мировых пикселях (до зума). */
const GRID_SIZE = 32;
const GRID_COLOR = 'rgba(15, 23, 42, 0.07)';
const AXIS_COLOR = '#94a3b8';

interface CanvasProps {
  tool: Tool;
  shapes: ShapeModel[];
  /** Черновик фигуры, который растягивается мышью (рисуется поверх остальных). */
  draft: ShapeDraft | null;
  selectedId: string | null;
  /** id фигуры, которую сейчас тащат мышью (null — перетаскивания нет). */
  draggingId: string | null;
  onSelectShape: (id: string | null) => void;
  onStartDraw: (kind: ShapeKind, origin: Point) => void;
  onUpdateDraw: (current: Point) => void;
  onCommitDraw: () => void;
  onCancelDraw: () => void;
  onStartDrag: (id: string, grab: Point) => void;
  onUpdateDrag: (current: Point) => void;
  onCommitDrag: () => void;
  onCancelDrag: () => void;
}

/**
 * Холст на весь экран: сетка на фоне, мышь и координаты фигур.
 * Камеру (зум/панорама) отдаёт useViewport, данные фигур — useShapes.
 */
export function Canvas({
  tool,
  shapes,
  draft,
  selectedId,
  draggingId,
  onSelectShape,
  onStartDraw,
  onUpdateDraw,
  onCommitDraw,
  onCancelDraw,
  onStartDrag,
  onUpdateDrag,
  onCommitDrag,
  onCancelDrag,
}: CanvasProps) {
  const { containerRef, viewport, isSpacePressed, isPanning } = useViewport();
  const [cursor, setCursor] = useState<Point | null>(null);

  /**
   * Мировая точка под курсором: screen = world * zoom + offset → обратный пересчёт.
   * Координаты считаем от рамки контейнера, а не от элемента события, чтобы
   * одинаково работать и для клика по фигуре (<svg>), и по пустому холсту (<div>).
   */
  const worldPointFrom = (event: { clientX: number; clientY: number }): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;
    return screenToCanvas({ x: event.clientX - left, y: event.clientY - top }, viewport);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Пробел с мышью заняты камерой — фигуры не трогаем.
    if (isSpacePressed || isPanning) return;
    const world = worldPointFrom(event);
    setCursor(world);

    if (tool === 'select') {
      onSelectShape(null);
      return;
    }

    // Захват указателя: перетаскивание продолжается, даже если курсор ушёл
    // за пределы окна. Координаты якоря — мировые, зум и панорама уже учтены.
    event.currentTarget.setPointerCapture(event.pointerId);
    onStartDraw(tool, world);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSpacePressed || isPanning) return;
    const world = worldPointFrom(event);
    setCursor(world);
    if (draft) onUpdateDraw(world);
    // updateDrag сам ничего не делает, если перетаскивания нет.
    onUpdateDrag(world);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) onCommitDraw();
    onCommitDrag();
    releaseCapture(event);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) onCancelDraw();
    onCancelDrag();
    releaseCapture(event);
  };

  const releaseCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleShapePointerDown = (event: ReactPointerEvent<SVGElement>, id: string) => {
    // С инструментом рисования клик по фигуре начинает новую фигуру, а не выделение.
    if (tool !== 'select' || isSpacePressed || isPanning) return;
    event.stopPropagation();
    const world = worldPointFrom(event);
    onSelectShape(id);
    // Захватываем указатель на контейнере: движение и отпускание продолжат
    // приходить сюда, даже если курсор ушёл за пределы окна.
    containerRef.current?.setPointerCapture(event.pointerId);
    onStartDrag(id, world);
  };

  // Сетка едет вместе с камерой: размер клетки масштабируется, начало — сдвигается.
  const gridStep = GRID_SIZE * viewport.zoom;
  const gridStyle: CSSProperties = {
    backgroundImage: [
      `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`,
    ].join(', '),
    backgroundSize: `${gridStep}px ${gridStep}px`,
    backgroundPosition: `${viewport.offsetX}px ${viewport.offsetY}px`,
  };

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : isSpacePressed
      ? 'cursor-grab'
      : draggingId
        ? 'cursor-move'
        : tool === 'select'
          ? 'cursor-default'
          : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => setCursor(null)}
      className={`absolute inset-0 z-0 select-none overflow-hidden bg-slate-50 ${cursorClass}`}
    >
      <div className="absolute inset-0" style={gridStyle} aria-hidden="true" />

      {/* Начало координат мира (0, 0) — видно, куда уехала камера */}
      <div
        className="absolute h-px w-4"
        style={{ left: viewport.offsetX - 8, top: viewport.offsetY, backgroundColor: AXIS_COLOR }}
        aria-hidden="true"
      />
      <div
        className="absolute h-4 w-px"
        style={{ left: viewport.offsetX, top: viewport.offsetY - 8, backgroundColor: AXIS_COLOR }}
        aria-hidden="true"
      />

      <svg className="absolute inset-0 h-full w-full" aria-label="Холст">
        {/* Один transform на всё содержимое: фигуры масштабируются вместе с канвасом. */}
        <g transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.zoom})`}>
          {draft && <Shape shape={draft} selected={false} zoom={viewport.zoom} />}
          {shapes.map((shape) => (
            <Shape
              key={shape.id}
              shape={shape}
              selected={shape.id === selectedId}
              zoom={viewport.zoom}
              movable={tool === 'select'}
              onPointerDown={(event) => handleShapePointerDown(event, shape.id)}
            />
          ))}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur">
        <span className="tabular-nums text-slate-700">{Math.round(viewport.zoom * 100)}%</span>
        <span className="h-3 w-px bg-slate-200" />
        <span className="tabular-nums">
          {cursor ? `${Math.round(cursor.x)}, ${Math.round(cursor.y)}` : '—, —'}
        </span>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-400 shadow-sm backdrop-blur">
        Пробел + перетаскивание — панорама · Колесо — зум
      </div>
    </div>
  );
}
