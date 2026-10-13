import type { Tool } from '../types/shape';

/**
 * Описание одного инструмента панели.
 * shortcut — то, что показываем пользователю, key — то, что сравниваем с e.key.
 */
export interface ToolDefinition {
  id: Tool;
  label: string;
  /** Буква-горячая клавиша (для подсказок в UI). */
  shortcut: string;
  /** Значение KeyboardEvent.key в нижнем регистре. */
  key: string;
}

/**
 * Единственный источник правды об инструментах.
 * Хотим поменять клавиши или добавить инструмент — правим только этот файл.
 */
export const TOOLS: readonly ToolDefinition[] = [
  { id: 'select', label: 'Выбор (V)', shortcut: 'V', key: 'v' },
  { id: 'rectangle', label: 'Прямоугольник (R)', shortcut: 'R', key: 'r' },
  { id: 'ellipse', label: 'Эллипс (O)', shortcut: 'O', key: 'o' },
];

/** Инструмент, с которым приложение стартует. */
export const DEFAULT_TOOL: Tool = 'select';

/** Регистр не важен: и «R», и «r» включат прямоугольник. */
export function toolFromKey(key: string): Tool | null {
  const normalized = key.toLowerCase();
  return TOOLS.find((tool) => tool.key === normalized)?.id ?? null;
}
