import type { Shape } from '../types/shape';

interface LayersPanelProps {
  shapes: Shape[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function LayerIcon({ kind }: { kind: Shape['kind'] }) {
  const common = {
    viewBox: '0 0 16 16',
    className: 'h-3.5 w-3.5 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    'aria-hidden': true,
  } as const;

  return kind === 'rectangle' ? (
    <svg {...common}>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
    </svg>
  ) : (
    <svg {...common}>
      <ellipse cx="8" cy="8" rx="5.5" ry="4" />
    </svg>
  );
}

/**
 * Панель слоёв справа (каркас, но уже показывает реальные фигуры).
 * Переименование, порядок и группировка слоёв — шаг 4.
 */
export function LayersPanel({ shapes, selectedId, onSelect }: LayersPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Слои</span>
        <span className="text-[11px] tabular-nums text-slate-300">{shapes.length}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {shapes.length === 0 ? (
          <p className="px-2 text-xs leading-relaxed text-slate-400">
            Пока пусто. Выберите инструмент «Прямоугольник» или «Эллипс» слева и растяните фигуру на холсте.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {[...shapes].reverse().map((shape) => {
              const isActive = shape.id === selectedId;
              return (
                <li key={shape.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(shape.id)}
                    aria-pressed={isActive}
                    className={[
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
                    ].join(' ')}
                  >
                    <LayerIcon kind={shape.kind} />
                    <span className="truncate">{shape.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
