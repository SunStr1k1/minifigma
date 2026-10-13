import { TOOLS } from '../constants/tools';
import type { Tool } from '../types/shape';

interface ToolbarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
}

/** Иконки рисуем сами — проект не тянет внешние библиотеки иконок. */
function ToolIcon({ tool }: { tool: Tool }) {
  const common = {
    viewBox: '0 0 20 20',
    className: 'h-[18px] w-[18px]',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    'aria-hidden': true,
  };

  if (tool === 'select') {
    return (
      <svg {...common}>
        <path d="M5 3.5 15.5 10l-4.4 1.1 2.2 4.3-1.9 1-2.2-4.3L5 15.2Z" fill="currentColor" fillOpacity={0.2} />
      </svg>
    );
  }

  if (tool === 'rectangle') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="13" height="11" rx="1.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <ellipse cx="10" cy="10" rx="6.5" ry="5" />
    </svg>
  );
}

/**
 * Панель инструментов слева.
 * Список и клавиши приходят из constants/tools.ts — здесь только отрисовка.
 */
export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
  return (
    <div className="absolute left-4 top-4 z-20 flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-lg shadow-slate-900/10">
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            aria-pressed={isActive}
            onClick={() => onSelectTool(tool.id)}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400',
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
            ].join(' ')}
          >
            <ToolIcon tool={tool.id} />
          </button>
        );
      })}
    </div>
  );
}
