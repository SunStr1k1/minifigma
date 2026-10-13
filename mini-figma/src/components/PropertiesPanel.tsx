import type { Shape } from '../types/shape';

interface PropertiesPanelProps {
  shape: Shape | null;
  /** Изменить свойство выделенной фигуры (например, цвет заливки). */
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
}

/** Строка свойства: подпись + поле. Пока значения только для чтения. */
function Field({ label, value }: { label: string; value: number }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 transition-colors focus-within:border-slate-400 focus-within:bg-white">
      <span className="w-3 text-[10px] font-semibold text-slate-400">{label}</span>
      <input
        className="w-full select-text bg-transparent text-xs tabular-nums text-slate-700 outline-none"
        value={Number.isFinite(value) ? Math.round(value) : 0}
        readOnly
      />
    </label>
  );
}

/** <input type="color"> понимает только #rrggbb — остальные значения показываем как есть. */
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

/**
 * Панель свойств справа.
 * Координаты пока readOnly, но цвет заливки можно менять живой выборкой — цвет
 * применяется сразу и перекрашивает фигуру.
 */
export function PropertiesPanel({ shape, onUpdateShape }: PropertiesPanelProps) {
  return (
    <section className="flex min-h-0 flex-col border-b border-slate-200">
      <header className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Свойства
      </header>

      <div className="px-4 pb-4">
        {!shape ? (
          <p className="text-xs leading-relaxed text-slate-400">
            Ничего не выбрано. Выберите фигуру на холсте или в списке слоёв.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="truncate text-xs font-medium text-slate-700">{shape.name}</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="X" value={shape.x} />
              <Field label="Y" value={shape.y} />
              <Field label="W" value={shape.width} />
              <Field label="H" value={shape.height} />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 transition-colors focus-within:border-slate-400 focus-within:bg-white">
              <span className="w-3 text-[10px] font-semibold text-slate-400">F</span>
              <input
                type="color"
                value={isHexColor(shape.fill) ? shape.fill : '#000000'}
                onChange={(event) => onUpdateShape(shape.id, { fill: event.target.value })}
                aria-label="Цвет заливки"
                className="h-5 w-8 shrink-0 cursor-pointer appearance-none rounded border border-slate-200 bg-transparent p-0"
              />
              <span className="select-text text-xs uppercase tabular-nums text-slate-600">{shape.fill}</span>
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
