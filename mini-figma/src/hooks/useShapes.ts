import { useCallback, useMemo, useRef, useState } from 'react';
import type { Point, Rect, Shape, ShapeDraft, ShapeKind } from '../types/shape';
import { dragTo, rectFromPoints } from '../utils/geometry';

const KIND_LABELS: Record<ShapeKind, string> = {
  rectangle: 'Прямоугольник',
  ellipse: 'Эллипс',
};

/** Стиль фигуры по умолчанию (шаг 2 заменит его на настройки из панели свойств). */
const DEFAULT_STYLE = {
  fill: '#3b82f6',
  stroke: '#1d4ed8',
  strokeWidth: 2,
  opacity: 1,
} as const;

/** Сколько шагов отмены храним в памяти. */
const HISTORY_LIMIT = 100;

/**
 * Подряд идущие правки одной фигуры (перетаскивание цвета в пикере, ввод
 * в поле) схлопываются в один шаг отмены, если между ними меньше этого времени.
 */
const EDIT_COALESCE_MS = 500;

let created = 0;

function nextId(): string {
  created += 1;
  return `shape-${Date.now().toString(36)}-${created.toString(36)}`;
}

/** Фабрика новой фигуры: id и имя добавит хук, стиль — здесь. */
export function createShapeDraft(kind: ShapeKind, rect: Rect): ShapeDraft {
  created += 1;
  return {
    kind,
    ...rect,
    name: `${KIND_LABELS[kind]} ${created}`,
    ...DEFAULT_STYLE,
  };
}

export interface UseShapesResult {
  shapes: Shape[];
  /**
   * Фигура, которую сейчас растягивают мышью по холсту.
   * Живёт только между pointerdown и pointerup, в «Слоях» не показывается.
   */
  draft: ShapeDraft | null;
  selectedId: string | null;
  selectedShape: Shape | null;
  /** id фигуры, которую сейчас тащат мышью (null — перетаскивания нет). */
  draggingId: string | null;
  /** Есть ли что отменить. */
  canUndo: boolean;
  /** Есть ли что повторить. */
  canRedo: boolean;
  /** Возвращает id созданной фигуры и сразу выделяет её. */
  addShape: (draft: ShapeDraft) => string;
  /** Начать перетаскивание: зафиксировать якорь и создать заготовку. */
  startDraw: (kind: ShapeKind, origin: Point) => void;
  /** Тянем мышь: прямоугольник растёт от якоря к текущей точке. */
  updateDraw: (current: Point) => void;
  /** Отпустили мышь: превратить заготовку в фигуру, вернуть её id (null — клик без сдвига). */
  commitDraw: () => string | null;
  /** Отменить рисование (pointercancel, смена инструмента). */
  cancelDraw: () => void;
  /** Начать перетаскивание фигуры: курсор схватил её в точке grab. */
  startDrag: (id: string, grab: Point) => void;
  /** Тянем мышь: фигура едет за курсором. */
  updateDrag: (current: Point) => void;
  /** Отпустили мышь: зафиксировать новое положение фигуры. */
  commitDrag: () => void;
  /** Отменить перетаскивание: вернуть фигуру на исходное место. */
  cancelDrag: () => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  /** Отменить последнее изменение. */
  undo: () => void;
  /** Повторить отменённое изменение. */
  redo: () => void;
}

/**
 * Состояние фигур: список, добавление, изменение, выделение и история
 * изменений для отмены/повтора.
 * Данные без визуала — компоненты только рисуют то, что вернёт хук.
 */
export function useShapes(): UseShapesResult {
  const [shapes, setShapesState] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ShapeDraft | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Сколько шагов лежит в стеках отмены/повтора. Сами стеки — в ref, а это
  // состояние нужно лишь чтобы перерисовать интерфейс и пересчитать canUndo/canRedo.
  const [history, setHistory] = useState({ past: 0, future: 0 });

  /**
   * Актуальный список фигур. Обновляется синхронно вместе с состоянием, чтобы
   * обработчики событий и история не зависели от момента ре-рендера.
   */
  const shapesRef = useRef<Shape[]>(shapes);
  // Снимки «до изменения» для отмены и отменённые состояния для повтора.
  const pastRef = useRef<Shape[][]>([]);
  const futureRef = useRef<Shape[][]>([]);
  // Последняя правка для склейки: ключ и время. null — склеивать нечего.
  const lastEditRef = useRef<{ key: string; at: number } | null>(null);
  // Якорь перетаскивания в мировых координатах. Не в состоянии: его читают
  // обработчики движения мыши, которые не должны зависеть от ре-рендеров.
  const drawAnchorRef = useRef<Point | null>(null);
  // Данные перетаскивания фигуры: что тащим, где она была, где её схватили
  // и снимок списка до перетаскивания — для отмены одним шагом.
  const dragRef = useRef<{ id: string; start: Point; grab: Point; before: Shape[] } | null>(null);

  /** Единая точка записи списка фигур: обновляет и ref, и состояние. */
  const syncShapes = useCallback((next: Shape[] | ((prev: Shape[]) => Shape[])) => {
    const value = typeof next === 'function' ? next(shapesRef.current) : next;
    shapesRef.current = value;
    setShapesState(value);
  }, []);

  /** Пересчитать размеры стеков для canUndo/canRedo. */
  const syncHistory = useCallback(() => {
    setHistory({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  /** Записать снимок в стек отмены и обнулить стек повтора. */
  const commitToPast = useCallback(
    (snapshot: Shape[]) => {
      const past = pastRef.current;
      past.push(snapshot);
      if (past.length > HISTORY_LIMIT) past.shift();
      futureRef.current = [];
      lastEditRef.current = null;
      syncHistory();
    },
    [syncHistory],
  );

  /**
   * Сохранить текущее состояние перед изменением.
   * key позволяет склеить подряд идущие правки одной фигуры в один шаг отмены.
   */
  const recordBeforeChange = useCallback(
    (key: string | null = null) => {
      const now = Date.now();
      const last = lastEditRef.current;
      const merge =
        key !== null && last !== null && last.key === key && now - last.at < EDIT_COALESCE_MS;
      if (merge && key !== null) {
        // Первое изменение шага уже в истории — просто продлеваем окно склейки.
        lastEditRef.current = { key, at: now };
        return;
      }
      commitToPast(shapesRef.current);
      if (key !== null) lastEditRef.current = { key, at: now };
    },
    [commitToPast],
  );

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(shapesRef.current);
    lastEditRef.current = null;
    syncShapes(previous);
    // Выделение могло указывать на фигуру, которой в прошлом состоянии нет.
    setSelectedId((id) => (id && previous.some((shape) => shape.id === id) ? id : null));
    syncHistory();
  }, [syncHistory, syncShapes]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    const past = pastRef.current;
    past.push(shapesRef.current);
    if (past.length > HISTORY_LIMIT) past.shift();
    lastEditRef.current = null;
    syncShapes(next);
    setSelectedId((id) => (id && next.some((shape) => shape.id === id) ? id : null));
    syncHistory();
  }, [syncHistory, syncShapes]);

  const addShape = useCallback(
    (draft: ShapeDraft): string => {
      const shape: Shape = { ...draft, id: nextId() };
      recordBeforeChange();
      syncShapes((prev) => [...prev, shape]);
      setSelectedId(shape.id);
      return shape.id;
    },
    [recordBeforeChange, syncShapes],
  );

  const startDraw = useCallback((kind: ShapeKind, origin: Point) => {
    drawAnchorRef.current = origin;
    setDraft(createShapeDraft(kind, rectFromPoints(origin, origin)));
  }, []);

  const updateDraw = useCallback((current: Point) => {
    const anchor = drawAnchorRef.current;
    if (!anchor) return;
    // Сохраняем имя и стиль заготовки — меняется только прямоугольник.
    setDraft((prev) => (prev ? { ...prev, ...rectFromPoints(anchor, current) } : prev));
  }, []);

  const commitDraw = useCallback((): string | null => {
    drawAnchorRef.current = null;
    if (!draft) return null;
    setDraft(null);
    // Клик или крошечный штрих не создают вырожденную фигуру.
    if (draft.width < 1 || draft.height < 1) return null;
    return addShape(draft);
  }, [addShape, draft]);

  const cancelDraw = useCallback(() => {
    drawAnchorRef.current = null;
    setDraft(null);
  }, []);

  const startDrag = useCallback((id: string, grab: Point) => {
    const shape = shapesRef.current.find((item) => item.id === id);
    if (!shape) return;
    dragRef.current = {
      id,
      start: { x: shape.x, y: shape.y },
      grab,
      before: shapesRef.current,
    };
    setSelectedId(id);
    setDraggingId(id);
  }, []);

  const updateDrag = useCallback(
    (current: Point) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = dragTo(drag.start, drag.grab, current);
      // Промежуточные движения не пишем в историю: шагом станет весь переезд.
      syncShapes((prev) =>
        prev.map((shape) => (shape.id === drag.id ? { ...shape, x: next.x, y: next.y } : shape)),
      );
    },
    [syncShapes],
  );

  const commitDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    if (!drag) return;
    const moved = shapesRef.current.some(
      (shape) => shape.id === drag.id && (shape.x !== drag.start.x || shape.y !== drag.start.y),
    );
    // Клик без движения не должен засорять историю.
    if (moved) commitToPast(drag.before);
  }, [commitToPast]);

  const cancelDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    if (!drag) return;
    syncShapes((prev) =>
      prev.map((shape) =>
        shape.id === drag.id ? { ...shape, x: drag.start.x, y: drag.start.y } : shape,
      ),
    );
  }, [syncShapes]);

  const updateShape = useCallback(
    (id: string, patch: Partial<Shape>) => {
      recordBeforeChange(`update:${id}`);
      syncShapes((prev) => prev.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)));
    },
    [recordBeforeChange, syncShapes],
  );

  const removeShape = useCallback(
    (id: string) => {
      if (!shapesRef.current.some((shape) => shape.id === id)) return;
      recordBeforeChange();
      syncShapes((prev) => prev.filter((shape) => shape.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [recordBeforeChange, syncShapes],
  );

  const selectShape = useCallback((id: string | null) => {
    // Выбор — не изменение данных, но он закрывает серию склейки правок.
    lastEditRef.current = null;
    setSelectedId(id);
  }, []);

  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedId) ?? null,
    [shapes, selectedId],
  );

  return {
    shapes,
    draft,
    selectedId,
    selectedShape,
    draggingId,
    canUndo: history.past > 0,
    canRedo: history.future > 0,
    addShape,
    startDraw,
    updateDraw,
    commitDraw,
    cancelDraw,
    startDrag,
    updateDrag,
    commitDrag,
    cancelDrag,
    updateShape,
    removeShape,
    selectShape,
    undo,
    redo,
  };
}
