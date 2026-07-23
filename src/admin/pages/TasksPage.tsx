import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, FormEvent, FC } from 'react';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    type DragEndEvent,
} from '@dnd-kit/core';
import { Plus, Pencil, Trash2, Calendar, X } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';
import {
    type Task,
    type TaskStatus,
    type TaskPriority,
    TASK_STATUS_LABELS,
    TASK_STATUS_ORDER,
    TASK_PRIORITY_LABELS,
    PAYER_LABELS,
} from '../types';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    high: 'bg-med-terracotta/10 text-med-terracotta',
    medium: 'bg-med-gold/10 text-med-gold',
    low: 'bg-med-azure/10 text-med-azure',
};

const ASSIGNEE_OPTIONS = ['cris', 'joan', 'comun'] as const;

export default function TasksPage() {
    const { data, loading, error, refetch } = useApi<Task[]>('/api/tasks');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [editing, setEditing] = useState<Task | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (data) setTasks(data);
    }, [data]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const byStatus = useMemo(() => {
        const map: Record<TaskStatus, Task[]> = {
            todo: [],
            in_progress: [],
            done: [],
        };
        for (const t of tasks) map[t.status]?.push(t);
        return map;
    }, [tasks]);

    const patchTask = async (id: number, patch: Partial<Task>) => {
        setActionError(null);
        try {
            await apiFetch(`/api/tasks?id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
        } catch (err) {
            setActionError((err as Error).message);
            refetch();
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        const taskId = Number(active.id);
        const newStatus = over.id as TaskStatus;
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
        );
        patchTask(taskId, { status: newStatus });
    };

    const addTask = async (status: TaskStatus) => {
        setActionError(null);
        try {
            const created = await apiFetch<Task>('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({ title: 'Nueva tarea', status }),
            });
            setTasks((prev) => [...prev, created]);
            setEditing(created);
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const saveTask = async (id: number, patch: Partial<Task>) => {
        setActionError(null);
        try {
            const updated = await apiFetch<Task>(`/api/tasks?id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
            setEditing(null);
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const deleteTask = async (id: number) => {
        if (!confirm('¿Eliminar esta tarea?')) return;
        setActionError(null);
        try {
            await apiFetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setEditing(null);
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
    if (loading) return <div className="p-8 text-med-ink/40">Cargando tareas…</div>;

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="font-serif text-3xl text-med-ink">Tareas</h1>
                <p className="text-sm text-med-ink/50 mt-1">
                    Arrastra las tarjetas entre columnas. Haz clic en el lápiz para editar.
                </p>
            </header>

            {actionError && (
                <div className="mb-4 text-sm text-med-terracotta bg-med-terracotta/5 px-4 py-2 rounded-lg">
                    {actionError}
                </div>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {TASK_STATUS_ORDER.map((status) => (
                        <Column
                            key={status}
                            status={status}
                            count={byStatus[status].length}
                            onAdd={() => addTask(status)}
                        >
                            {byStatus[status].map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={() => setEditing(task)}
                                    onDelete={() => deleteTask(task.id)}
                                />
                            ))}
                        </Column>
                    ))}
                </div>
            </DndContext>

            {editing && (
                <TaskModal
                    task={editing}
                    onClose={() => setEditing(null)}
                    onSave={(patch) => saveTask(editing.id, patch)}
                    onDelete={() => deleteTask(editing.id)}
                />
            )}
        </div>
    );
}

const Column: FC<{
    status: TaskStatus;
    count: number;
    onAdd: () => void;
    children: ReactNode;
}> = ({ status, count, onAdd, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div
            ref={setNodeRef}
            className={`rounded-xl border p-3 min-h-[12rem] transition-colors ${isOver
                    ? 'border-med-olive/40 bg-med-olive/5'
                    : 'border-med-olive/10 bg-med-cream/40'
                }`}
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-med-ink/60">
                    {TASK_STATUS_LABELS[status]}
                    <span className="ml-2 text-med-ink/30">{count}</span>
                </h2>
                <button
                    onClick={onAdd}
                    className="text-med-ink/40 hover:text-med-olive transition"
                    title="Añadir tarea"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
};

const TaskCard: FC<{
    task: Task;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ task, onEdit, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({ id: String(task.id) });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 50,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-white rounded-lg border border-med-olive/10 p-3 shadow-sm ${isDragging ? 'opacity-60' : ''
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div
                    {...listeners}
                    {...attributes}
                    className="flex-1 cursor-grab active:cursor-grabbing"
                >
                    <div className="text-sm font-medium text-med-ink">{task.title}</div>
                    {task.description && (
                        <div className="text-xs text-med-ink/50 mt-1 line-clamp-2">
                            {task.description}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onEdit}
                        className="text-med-ink/40 hover:text-med-olive transition"
                        title="Editar"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onDelete}
                        className="text-med-ink/40 hover:text-med-terracotta transition"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_STYLES[task.priority]}`}
                >
                    {TASK_PRIORITY_LABELS[task.priority]}
                </span>
                {task.assignee && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-med-olive/10 text-med-olive">
                        {PAYER_LABELS[task.assignee as keyof typeof PAYER_LABELS] ??
                            task.assignee}
                    </span>
                )}
                {task.due_date && (
                    <span className="text-[10px] text-med-ink/40 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('es-ES')}
                    </span>
                )}
            </div>
        </div>
    );
};

function TaskModal({
    task,
    onClose,
    onSave,
    onDelete,
}: {
    task: Task;
    onClose: () => void;
    onSave: (patch: Partial<Task>) => void;
    onDelete: () => void;
}) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');
    const [status, setStatus] = useState<TaskStatus>(task.status);
    const [priority, setPriority] = useState<TaskPriority>(task.priority);
    const [assignee, setAssignee] = useState(task.assignee ?? '');
    const [dueDate, setDueDate] = useState(
        task.due_date ? task.due_date.slice(0, 10) : '',
    );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSave({
            title: title.trim() || 'Sin título',
            description: description.trim() || null,
            status,
            priority,
            assignee: assignee || null,
            due_date: dueDate || null,
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-med-ink/40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-med-ink">Editar tarea</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-med-ink/40 hover:text-med-ink transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                    Título
                </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 mb-4 rounded-lg border border-med-olive/20 focus:border-med-terracotta focus:outline-none focus:ring-2 focus:ring-med-terracotta/20"
                />

                <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                    Descripción
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 mb-4 rounded-lg border border-med-olive/20 focus:border-med-terracotta focus:outline-none focus:ring-2 focus:ring-med-terracotta/20 resize-none"
                />

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                            Estado
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="w-full px-3 py-2 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-2 focus:ring-med-terracotta/20"
                        >
                            {TASK_STATUS_ORDER.map((s) => (
                                <option key={s} value={s}>
                                    {TASK_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                            Prioridad
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            className="w-full px-3 py-2 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-2 focus:ring-med-terracotta/20"
                        >
                            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                                <option key={p} value={p}>
                                    {TASK_PRIORITY_LABELS[p]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                            Responsable
                        </label>
                        <select
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-2 focus:ring-med-terracotta/20"
                        >
                            <option value="">—</option>
                            {ASSIGNEE_OPTIONS.map((a) => (
                                <option key={a} value={a}>
                                    {PAYER_LABELS[a]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-med-ink/50 mb-1">
                            Fecha límite
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-2 focus:ring-med-terracotta/20"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex items-center gap-2 text-sm text-med-terracotta hover:underline"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm text-med-ink/60 hover:bg-med-olive/5 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-med-olive text-white text-sm hover:bg-med-olive/90 transition"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
