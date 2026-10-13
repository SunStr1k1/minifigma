import { useState } from 'react';
import { Canvas } from './components/Canvas';
import { LayersPanel } from './components/LayersPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Toolbar } from './components/Toolbar';
import { DEFAULT_TOOL } from './constants/tools';
import { useHotkeys } from './hooks/useHotkeys';
import { useShapes } from './hooks/useShapes';
import type { Tool } from './types/shape';

/**
 * Собирает холст и три панели.
 * Каждая зона экрана — отдельный компонент, каждая забота — отдельный хук.
 */
export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>(DEFAULT_TOOL);
  const {
    shapes,
    draft,
    selectedId,
    selectedShape,
    draggingId,
    canUndo,
    canRedo,
    selectShape,
    updateShape,
    removeShape,
    startDraw,
    updateDraw,
    commitDraw,
    cancelDraw,
    startDrag,
    updateDrag,
    commitDrag,
    cancelDrag,
    undo,
    redo,
  } = useShapes();

  // Инструменты переключаются клавишами V / R / O, Delete удаляет выделенное.
  useHotkeys({
    enabled: true,
    onToolChange: setActiveTool,
    onDelete: () => {
      if (selectedId) removeShape(selectedId);
    },
    onUndo: () => {
      undo();
    },
    onRedo: () => {
      redo();
    },
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <Canvas
        tool={activeTool}
        shapes={shapes}
        draft={draft}
        selectedId={selectedId}
        draggingId={draggingId}
        onSelectShape={selectShape}
        onStartDraw={startDraw}
        onUpdateDraw={updateDraw}
        onCommitDraw={commitDraw}
        onCancelDraw={cancelDraw}
        onStartDrag={startDrag}
        onUpdateDrag={updateDrag}
        onCommitDrag={commitDrag}
        onCancelDrag={cancelDrag}
      />

      <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />

      <aside className="absolute right-0 top-0 z-20 flex h-full w-64 flex-col border-l border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur">
        <PropertiesPanel shape={selectedShape} onUpdateShape={updateShape} />
        <LayersPanel shapes={shapes} selectedId={selectedId} onSelect={selectShape} />
      </aside>
    </div>
  );
}
