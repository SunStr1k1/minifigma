import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Point, Viewport } from '../types/shape';
import { panViewport, zoomAt } from '../utils/geometry';

/** Мировая точка (0, 0) стартует в центре экрана. */
const INITIAL_VIEWPORT: Viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
/** Насколько резко колесо меняет масштаб. */
const WHEEL_ZOOM_SPEED = 0.0015;

export interface UseViewportResult {
  /** Куда монтировать холст: слушатели колеса и мыши вешаются на этот элемент. */
  containerRef: RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  /** Пробел зажат — можно панорамировать. */
  isSpacePressed: boolean;
  /** Идёт перетаскивание холста. */
  isPanning: boolean;
  /** Вернуть камеру так, чтобы (0, 0) оказался в центре. */
  center: () => void;
}

/**
 * Камера канваса: панорамирование (пробел + перетаскивание),
 * зум колесом от 10% до 400% вокруг курсора, центрирование при старте.
 *
 * Только состояние и события — никакой отрисовки.
 */
export function useViewport(): UseViewportResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [isSpacePressed, setSpacePressed] = useState(false);
  const [isPanning, setPanning] = useState(false);

  // Значения, которые читают слушатели вне React (без пересоздания эффектов).
  const spacePressedRef = useRef(false);
  const panningRef = useRef(false);
  const lastPointerRef = useRef<Point | null>(null);

  const center = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewport((current) => ({
      ...current,
      offsetX: el.clientWidth / 2,
      offsetY: el.clientHeight / 2,
    }));
  }, []);

  // Центрирование при старте.
  useEffect(() => {
    center();
  }, [center]);

  // Пробел: зажали — режим панорамирования, отпустили — вышли из него.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) return;
      // Не даём пробелу скроллить страницу и мешать кнопкам в фокусе.
      event.preventDefault();
      spacePressedRef.current = true;
      setSpacePressed(true);
    };

    const releaseSpace = () => {
      spacePressedRef.current = false;
      setSpacePressed(false);
      panningRef.current = false;
      lastPointerRef.current = null;
      setPanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', releaseSpace);
    window.addEventListener('blur', releaseSpace);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', releaseSpace);
      window.removeEventListener('blur', releaseSpace);
    };
  }, []);

  // Зум колесом и панорамирование мышью.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      // preventDefault работает только если слушатель не passive.
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED);
      setViewport((current) => zoomAt(current, anchor, current.zoom * factor));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !spacePressedRef.current) return;
      event.preventDefault();
      panningRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      setPanning(true);
      // Захват указателя: перетаскивание продолжается, даже если курсор ушёл за пределы окна.
      el.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const last = lastPointerRef.current;
      if (!panningRef.current || !last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      setViewport((current) => panViewport(current, dx, dy));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!panningRef.current) return;
      panningRef.current = false;
      lastPointerRef.current = null;
      setPanning(false);
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return { containerRef, viewport, isSpacePressed, isPanning, center };
}
