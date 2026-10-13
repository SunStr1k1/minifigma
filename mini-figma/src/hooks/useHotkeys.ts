import { useEffect } from 'react';
import { toolFromKey } from '../constants/tools';
import type { Tool } from '../types/shape';

export interface UseHotkeysOptions {
  /**
   * Выключен — клавиши не слушаются (например, пока рисуем в кастомном поле).
   */
  enabled?: boolean;
  /** Смена инструмента по горячей клавише. */
  onToolChange?: (tool: Tool) => void;
  /** Удаление выделенной фигуры (Delete / Backspace). */
  onDelete?: () => void;
  /** Отмена последнего изменения (Ctrl/Cmd+Z). */
  onUndo?: () => void;
  /** Повтор отменённого изменения (Ctrl/Cmd+Shift+Z, Ctrl+Y). */
  onRedo?: () => void;
}

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.tagName === 'SELECT');

/**
 * Горячие клавиши: инструменты (V / R / O), удаление (Delete / Backspace)
 * и отмена/повтор (Ctrl+Z / Ctrl+Shift+Z, плюс Ctrl+Y).
 * Регистр клавиш инструментов лежит в constants/tools.ts — здесь только
 * доставка события туда, где меняется состояние.
 */
export function useHotkeys({
  enabled = false,
  onToolChange,
  onDelete,
  onUndo,
  onRedo,
}: UseHotkeysOptions = {}): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // В полях ввода и при зажатом Alt горячие клавиши не перехватываем.
      if (isEditableTarget(event.target) || event.altKey) return;

      // Ctrl/Cmd — сочетания для истории. Остальные модификаторные клавиши не трогаем.
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey && onUndo) {
          event.preventDefault();
          onUndo();
          return;
        }
        if (((key === 'z' && event.shiftKey) || key === 'y') && onRedo) {
          event.preventDefault();
          onRedo();
          return;
        }
        return;
      }

      const tool = toolFromKey(event.key);
      if (tool) {
        event.preventDefault();
        onToolChange?.(tool);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && onDelete) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onToolChange, onDelete, onUndo, onRedo]);
}
