import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings2, Plus, RotateCcw, Check, GripVertical } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';
import type { Guest, Rsvp, BudgetItem, Task, SeatingTable } from '../types';
import {
  type Widget,
  type WidgetDraft,
  type ChartType,
  type WidgetSize,
  type DashboardData,
  DEFAULT_LAYOUT,
  LAYOUT_KEY,
  readCache,
  writeCache,
  sanitizeLayout,
  uid,
} from '../dashboard/registry';
import { WidgetCard, AddBlockModal, CustomBlockModal, widgetSpan } from '../dashboard/widgets';

export default function SummaryPage() {
  const { data: guests, loading, error } = useApi<Guest[]>('/api/guests');
  const { data: rsvps } = useApi<Rsvp[]>('/api/rsvps');
  const { data: budget } = useApi<BudgetItem[]>('/api/budget');
  const { data: tasks } = useApi<Task[]>('/api/tasks');
  const { data: tables } = useApi<SeatingTable[]>('/api/tables');
  const { data: saved } = useApi<{ value: Widget[] | null }>(
    `/api/settings?key=${LAYOUT_KEY}`,
  );

  const [layout, setLayout] = useState<Widget[]>(() => readCache() ?? DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const serverApplied = useRef(false);

  // Apply the server-stored layout once (source of truth across devices).
  useEffect(() => {
    if (!saved || serverApplied.current) return;
    serverApplied.current = true;
    if (saved.value != null && Array.isArray(saved.value)) {
      const l = sanitizeLayout(saved.value);
      setLayout(l);
      writeCache(l);
    }
  }, [saved]);

  const data: DashboardData = useMemo(
    () => ({
      guests: guests ?? [],
      rsvps: rsvps ?? [],
      budget: budget ?? [],
      tasks: tasks ?? [],
      tables: tables ?? [],
    }),
    [guests, rsvps, budget, tasks, tables],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Persist to cache + database.
  const apply = (next: Widget[]) => {
    setLayout(next);
    writeCache(next);
    apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: LAYOUT_KEY, value: next }),
    }).catch(() => {
      /* offline: cache still holds the change */
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = layout.findIndex((w) => w.id === active.id);
    const to = layout.findIndex((w) => w.id === over.id);
    if (from < 0 || to < 0) return;
    apply(arrayMove(layout, from, to));
  };

  const remove = (id: string) => apply(layout.filter((w) => w.id !== id));

  const changeChart = (id: string, chart: ChartType) =>
    apply(
      layout.map((w) =>
        w.id === id && (w.kind === 'chart' || w.kind === 'custom-chart')
          ? { ...w, chart }
          : w,
      ),
    );

  const changeSize = (id: string, size: WidgetSize) =>
    apply(layout.map((w) => (w.id === id ? { ...w, size } : w)));

  const add = (widget: WidgetDraft) => {
    apply([...layout, { ...widget, id: uid() } as Widget]);
    setAddOpen(false);
  };

  const reset = () => apply(DEFAULT_LAYOUT.map((w) => ({ ...w, id: uid() })));

  if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
  if (loading) return <div className="p-8 text-med-ink/40">Cargando resumen…</div>;

  return (
    <div className="p-8">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-med-ink">Resumen</h1>
          <p className="text-sm text-med-ink/50 mt-1">
            {editing
              ? 'Arrastra por el asa para reordenar. Cambia tamaño/tipo o quita bloques. Se guarda solo.'
              : 'Estado general de la boda'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-med-olive text-white text-sm hover:bg-med-olive/90 transition"
              >
                <Plus className="w-4 h-4" />
                Añadir bloque
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-med-olive/20 text-sm text-med-ink/70 hover:bg-med-olive/5 transition"
                title="Restablecer diseño por defecto"
              >
                <RotateCcw className="w-4 h-4" />
                Restablecer
              </button>
            </>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${editing
                ? 'bg-med-ink text-white'
                : 'border border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5'
              }`}
          >
            {editing ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            {editing ? 'Hecho' : 'Personalizar'}
          </button>
        </div>
      </header>

      {layout.length === 0 ? (
        <div className="rounded-xl border border-dashed border-med-olive/30 p-12 text-center text-med-ink/40">
          No hay bloques. Pulsa «Personalizar» → «Añadir bloque».
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-[10rem]">
              {layout.map((w) => (
                <SortableWidget
                  key={w.id}
                  widget={w}
                  data={data}
                  editing={editing}
                  onRemove={() => remove(w.id)}
                  onChartChange={(chart) => changeChart(w.id, chart)}
                  onSizeChange={(size) => changeSize(w.id, size)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {addOpen && (
        <AddBlockModal
          onClose={() => setAddOpen(false)}
          onAdd={add}
          onCustom={() => {
            setAddOpen(false);
            setCustomOpen(true);
          }}
          used={new Set(layout.map((w) => `${w.kind}:${w.ref}`))}
        />
      )}

      {customOpen && (
        <CustomBlockModal
          data={data}
          onClose={() => setCustomOpen(false)}
          onAdd={(w) => {
            add(w);
            setCustomOpen(false);
          }}
        />
      )}
    </div>
  );
}

const SortableWidget: FC<{
  widget: Widget;
  data: DashboardData;
  editing: boolean;
  onRemove: () => void;
  onChartChange: (chart: ChartType) => void;
  onSizeChange: (size: WidgetSize) => void;
}> = ({ widget, data, editing, onRemove, onChartChange, onSizeChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id, disabled: !editing });

  const style = {
    // Use Translate (not Transform) so the dragged block keeps its own size
    // instead of being scaled to fit the block it hovers over.
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const dragHandle = editing ? (
    <button
      {...attributes}
      {...listeners}
      className="p-1 text-med-ink/40 hover:text-med-olive cursor-grab active:cursor-grabbing touch-none"
      title="Arrastra para reordenar"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  ) : undefined;

  return (
    <div ref={setNodeRef} style={style} className={`${widgetSpan(widget)} h-full`}>
      <WidgetCard
        widget={widget}
        data={data}
        editing={editing}
        onRemove={onRemove}
        onChartChange={onChartChange}
        onSizeChange={onSizeChange}
        dragHandle={dragHandle}
      />
    </div>
  );
}
