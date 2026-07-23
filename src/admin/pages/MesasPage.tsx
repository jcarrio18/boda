import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode, FC } from 'react';
import { Plus, Trash2, UserPlus, X, Crown, Copy, RotateCw } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';
import type { Guest, SeatingTable, TableShape } from '../types';

const CANVAS_W = 1100;
const CANVAS_H = 760;
const CHAIR = 16; // chair size in px
const CHAIR_OFFSET = 12; // distance of chairs outside the table edge
const OVAL_RATIO = 1.6; // width / height for oval tables

const num = (v: number | string | null | undefined): number => {
    const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
    return Number.isFinite(n as number) ? (n as number) : 0;
};

/**
 * Dimensions for a shape keeping the largest current side as reference, so the
 * overall size is preserved while the aspect ratio matches the shape.
 */
function applyShape(
    shape: TableShape,
    w: number,
    h: number,
): { width: number; height: number } {
    const size = Math.max(w, h);
    if (shape === 'oval') {
        return { width: size, height: Math.round(size / OVAL_RATIO) };
    }
    return { width: size, height: size };
}

/** Positions (relative to the table's top-left) for chairs around the perimeter. */
function getChairPositions(
    shape: TableShape,
    w: number,
    h: number,
    seats: number,
): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    if (seats <= 0) return pts;

    if (shape === 'square') {
        // Distribute seats across the 4 sides proportionally to their length,
        // then center them on each side (no clustering at the corners).
        const sideLen = [w, h, w, h]; // top, right, bottom, left
        const total = 2 * (w + h);
        const raw = sideLen.map((len) => (seats * len) / total);
        const counts = raw.map((r) => Math.floor(r));
        let assigned = counts.reduce((a, b) => a + b, 0);
        const order = raw
            .map((r, i) => ({ i, frac: r - Math.floor(r) }))
            .sort((a, b) => b.frac - a.frac);
        let k = 0;
        while (assigned < seats) {
            counts[order[k % 4].i]++;
            assigned++;
            k++;
        }
        for (let side = 0; side < 4; side++) {
            const n = counts[side];
            for (let j = 0; j < n; j++) {
                const frac = (j + 0.5) / n;
                if (side === 0) pts.push({ x: frac * w, y: -CHAIR_OFFSET });
                else if (side === 1) pts.push({ x: w + CHAIR_OFFSET, y: frac * h });
                else if (side === 2) pts.push({ x: w - frac * w, y: h + CHAIR_OFFSET });
                else pts.push({ x: -CHAIR_OFFSET, y: h - frac * h });
            }
        }
        return pts;
    }

    // Ellipse (circle / oval): distribute by angle, starting at the top.
    const rx = w / 2 + CHAIR_OFFSET;
    const ry = h / 2 + CHAIR_OFFSET;
    for (let i = 0; i < seats; i++) {
        const ang = (i / seats) * Math.PI * 2 - Math.PI / 2;
        pts.push({
            x: w / 2 + rx * Math.cos(ang),
            y: h / 2 + ry * Math.sin(ang),
        });
    }
    return pts;
}

export default function MesasPage() {
    const {
        data: tablesData,
        loading,
        error,
        refetch: refetchTables,
    } = useApi<SeatingTable[]>('/api/tables');
    const { data: guests, refetch: refetchGuests } = useApi<Guest[]>('/api/guests');

    const [tables, setTables] = useState<SeatingTable[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (tablesData) setTables(tablesData);
    }, [tablesData]);

    const selected = tables.find((t) => t.id === selectedId) ?? null;

    const guestsByTable = useMemo(() => {
        const map = new Map<number, Guest[]>();
        for (const g of guests ?? []) {
            if (g.table_id != null) {
                const bucket = map.get(g.table_id) ?? [];
                bucket.push(g);
                map.set(g.table_id, bucket);
            }
        }
        return map;
    }, [guests]);

    const unassigned = useMemo(
        () => (guests ?? []).filter((g) => g.table_id == null),
        [guests],
    );

    const setLocalTable = (id: number, patch: Partial<SeatingTable>) =>
        setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

    // Next table number = current maximum numeric label + 1.
    const nextTableNumber = () => {
        const nums = tables
            .map((t) => parseInt(t.label ?? '', 10))
            .filter((n) => Number.isFinite(n));
        return nums.length ? Math.max(...nums) + 1 : 1;
    };

    const patchTable = async (id: number, patch: Partial<SeatingTable>) => {
        setActionError(null);
        try {
            await apiFetch(`/api/tables?id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
        } catch (err) {
            setActionError((err as Error).message);
            refetchTables();
        }
    };

    const addTable = async (shape: TableShape, isHead = false) => {
        setActionError(null);
        const count = tables.length;
        const label = isHead ? 'Presidencia' : String(nextTableNumber());
        const dims = applyShape(shape, 96, 96);
        try {
            const created = await apiFetch<SeatingTable>('/api/tables', {
                method: 'POST',
                body: JSON.stringify({
                    shape,
                    is_head: isHead,
                    label,
                    x: 120 + (count % 6) * 40,
                    y: 120 + (count % 6) * 30,
                    width: dims.width,
                    height: dims.height,
                    seats: isHead ? 2 : 8,
                }),
            });
            setTables((prev) => [...prev, created]);
            setSelectedId(created.id);
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const removeTable = async (id: number) => {
        if (!confirm('¿Eliminar esta mesa? Los invitados asignados quedarán libres.'))
            return;
        setActionError(null);
        try {
            await apiFetch(`/api/tables?id=${id}`, { method: 'DELETE' });
            setTables((prev) => prev.filter((t) => t.id !== id));
            if (selectedId === id) setSelectedId(null);
            refetchGuests();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const assignGuest = async (guestId: number, tableId: number | null) => {
        setActionError(null);
        try {
            await apiFetch(`/api/guests?id=${guestId}`, {
                method: 'PATCH',
                body: JSON.stringify({ table_id: tableId }),
            });
            refetchGuests();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const duplicateTable = async (source: SeatingTable) => {
        setActionError(null);
        try {
            const created = await apiFetch<SeatingTable>('/api/tables', {
                method: 'POST',
                body: JSON.stringify({
                    shape: source.shape,
                    seats: source.seats,
                    width: num(source.width),
                    height: num(source.height),
                    is_head: source.is_head,
                    label: source.is_head ? 'Presidencia' : String(nextTableNumber()),
                    x: Math.min(CANVAS_W - num(source.width), num(source.x) + 30),
                    y: Math.min(CANVAS_H - num(source.height), num(source.y) + 30),
                }),
            });
            setTables((prev) => [...prev, created]);
            setSelectedId(created.id);
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
    if (loading) return <div className="p-8 text-med-ink/40">Cargando mesas…</div>;

    return (
        <div className="p-6 flex flex-col xl:flex-row gap-6">
            {/* Canvas */}
            <div className="flex-1 min-w-0">
                <header className="mb-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="font-serif text-3xl text-med-ink">Mesas</h1>
                        <p className="text-sm text-med-ink/50 mt-1">
                            Arrastra las mesas por el lienzo. Selecciona una para editarla.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <AddButton label="Ovalada" onClick={() => addTable('oval')} />
                        <AddButton label="Circular" onClick={() => addTable('circle')} />
                        <AddButton label="Cuadrada" onClick={() => addTable('square')} />
                        <AddButton
                            label="Presidencial"
                            icon={<Crown className="w-3.5 h-3.5" />}
                            onClick={() => addTable('oval', true)}
                        />
                    </div>
                </header>

                {actionError && (
                    <div className="mb-3 text-sm text-med-terracotta bg-med-terracotta/5 px-4 py-2 rounded-lg">
                        {actionError}
                    </div>
                )}

                <div className="overflow-auto rounded-xl border border-med-olive/15 bg-white">
                    <div
                        className="relative"
                        style={{
                            width: CANVAS_W,
                            height: CANVAS_H,
                            backgroundImage:
                                'radial-gradient(circle, rgba(90,90,64,0.08) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                        onPointerDown={() => setSelectedId(null)}
                    >
                        {tables.map((table) => (
                            <TableNode
                                key={table.id}
                                table={table}
                                selected={table.id === selectedId}
                                assigned={guestsByTable.get(table.id)?.length ?? 0}
                                onSelect={() => setSelectedId(table.id)}
                                onLocalUpdate={(patch) => setLocalTable(table.id, patch)}
                                onCommitUpdate={(patch) => patchTable(table.id, patch)}
                                onDuplicate={() => duplicateTable(table)}
                                onDelete={() => removeTable(table.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Side panel */}
            <aside className="w-full xl:w-80 shrink-0 space-y-4">
                {selected ? (
                    <TableEditor
                        table={selected}
                        assignedGuests={guestsByTable.get(selected.id) ?? []}
                        unassigned={unassigned}
                        onChangeLocal={(patch) => setLocalTable(selected.id, patch)}
                        onCommit={(patch) => patchTable(selected.id, patch)}
                        onDelete={() => removeTable(selected.id)}
                        onDuplicate={() => duplicateTable(selected)}
                        onAssign={(gid) => assignGuest(gid, selected.id)}
                        onUnassign={(gid) => assignGuest(gid, null)}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-med-olive/10 p-5 text-sm text-med-ink/50">
                        Selecciona una mesa en el lienzo para editar su número, tamaño, sillas
                        e invitados.
                    </div>
                )}

                {/* Table list */}
                <div className="bg-white rounded-xl border border-med-olive/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-med-olive/10 text-xs font-semibold uppercase tracking-wider text-med-ink/50">
                        Mesas ({tables.length})
                    </div>
                    <ul className="divide-y divide-med-olive/5 max-h-72 overflow-auto">
                        {tables.map((t) => {
                            const assigned = guestsByTable.get(t.id)?.length ?? 0;
                            return (
                                <li key={t.id}>
                                    <button
                                        onClick={() => setSelectedId(t.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-med-cream/60 transition ${t.id === selectedId ? 'bg-med-olive/5' : ''
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {t.is_head && <Crown className="w-3.5 h-3.5 text-med-gold" />}
                                            {t.label || `Mesa ${t.id}`}
                                        </span>
                                        <span
                                            className={`text-xs ${assigned > t.seats
                                                    ? 'text-med-terracotta'
                                                    : 'text-med-ink/40'
                                                }`}
                                        >
                                            {assigned}/{t.seats}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                        {tables.length === 0 && (
                            <li className="px-4 py-6 text-center text-sm text-med-ink/40">
                                Aún no hay mesas. Añade una con los botones de arriba.
                            </li>
                        )}
                    </ul>
                </div>
            </aside>
        </div>
    );
}

function AddButton({
    label,
    icon,
    onClick,
}: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-med-olive/20 text-xs text-med-ink/70 hover:bg-med-olive/5 transition"
        >
            {icon ?? <Plus className="w-3.5 h-3.5" />}
            {label}
        </button>
    );
}

const HANDLES = [
    { dir: 'nw', lx: 0, ly: 0, cursor: 'nwse-resize' },
    { dir: 'n', lx: 50, ly: 0, cursor: 'ns-resize' },
    { dir: 'ne', lx: 100, ly: 0, cursor: 'nesw-resize' },
    { dir: 'e', lx: 100, ly: 50, cursor: 'ew-resize' },
    { dir: 'se', lx: 100, ly: 100, cursor: 'nwse-resize' },
    { dir: 's', lx: 50, ly: 100, cursor: 'ns-resize' },
    { dir: 'sw', lx: 0, ly: 100, cursor: 'nesw-resize' },
    { dir: 'w', lx: 0, ly: 50, cursor: 'ew-resize' },
] as const;

const MIN_SIZE = 50;

const TableNode: FC<{
    table: SeatingTable;
    selected: boolean;
    assigned: number;
    onSelect: () => void;
    onLocalUpdate: (patch: Partial<SeatingTable>) => void;
    onCommitUpdate: (patch: Partial<SeatingTable>) => void;
    onDuplicate: () => void;
    onDelete: () => void;
}> = ({
    table,
    selected,
    assigned,
    onSelect,
    onLocalUpdate,
    onCommitUpdate,
    onDuplicate,
    onDelete,
}) => {
        const w = num(table.width);
        const h = num(table.height);
        const x = num(table.x);
        const y = num(table.y);
        const rot = num(table.rotation);
        const containerRef = useRef<HTMLDivElement | null>(null);
        const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(
            null,
        );
        const resize = useRef<{
            dir: string;
            px: number;
            py: number;
            x: number;
            y: number;
            w: number;
            h: number;
            rot: number;
        } | null>(null);
        const rotating = useRef(false);
        const moved = useRef(false);
        const last = useRef<Partial<SeatingTable>>({});

        const chairs = useMemo(
            () => getChairPositions(table.shape, w, h, table.seats),
            [table.shape, w, h, table.seats],
        );

        // --- Dragging the table ---
        const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { px: e.clientX, py: e.clientY, x, y };
            moved.current = false;
            onSelect();
        };

        const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
            if (!drag.current) return;
            const dx = e.clientX - drag.current.px;
            const dy = e.clientY - drag.current.py;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
            const nx = Math.max(0, Math.min(CANVAS_W - w, drag.current.x + dx));
            const ny = Math.max(0, Math.min(CANVAS_H - h, drag.current.y + dy));
            last.current = { x: nx, y: ny };
            onLocalUpdate(last.current);
        };

        const onPointerUp = () => {
            if (!drag.current) return;
            drag.current = null;
            if (moved.current && last.current.x != null) onCommitUpdate(last.current);
        };

        // --- Resizing via edge/corner handles (respects rotation) ---
        const startResize = (e: ReactPointerEvent<HTMLDivElement>, dir: string) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            resize.current = { dir, px: e.clientX, py: e.clientY, x, y, w, h, rot };
            onSelect();
        };

        const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
            const r = resize.current;
            if (!r) return;
            const dxScreen = e.clientX - r.px;
            const dyScreen = e.clientY - r.py;
            const th = (r.rot * Math.PI) / 180;
            const cos = Math.cos(th);
            const sin = Math.sin(th);
            const dLocalX = dxScreen * cos + dyScreen * sin;
            const dLocalY = -dxScreen * sin + dyScreen * cos;

            let dw = 0;
            let dh = 0;
            if (r.dir.includes('e')) dw = dLocalX;
            if (r.dir.includes('w')) dw = -dLocalX;
            if (r.dir.includes('s')) dh = dLocalY;
            if (r.dir.includes('n')) dh = -dLocalY;

            const newW = Math.max(MIN_SIZE, r.w + dw);
            const newH = Math.max(MIN_SIZE, r.h + dh);
            const appliedDw = newW - r.w;
            const appliedDh = newH - r.h;

            let shiftX = 0;
            let shiftY = 0;
            if (r.dir.includes('e')) {
                shiftX += cos * (appliedDw / 2);
                shiftY += sin * (appliedDw / 2);
            }
            if (r.dir.includes('w')) {
                shiftX -= cos * (appliedDw / 2);
                shiftY -= sin * (appliedDw / 2);
            }
            if (r.dir.includes('s')) {
                shiftX += -sin * (appliedDh / 2);
                shiftY += cos * (appliedDh / 2);
            }
            if (r.dir.includes('n')) {
                shiftX -= -sin * (appliedDh / 2);
                shiftY -= cos * (appliedDh / 2);
            }

            const cx = r.x + r.w / 2 + shiftX;
            const cy = r.y + r.h / 2 + shiftY;
            last.current = {
                x: cx - newW / 2,
                y: cy - newH / 2,
                width: newW,
                height: newH,
            };
            onLocalUpdate(last.current);
        };

        const endResize = () => {
            if (!resize.current) return;
            resize.current = null;
            if (last.current.width != null) onCommitUpdate(last.current);
        };

        // --- Free rotation via the top handle ---
        const startRotate = (e: ReactPointerEvent<HTMLDivElement>) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            rotating.current = true;
            onSelect();
        };

        const onRotateMove = (e: ReactPointerEvent<HTMLDivElement>) => {
            if (!rotating.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
            deg = Math.round((((deg % 360) + 360) % 360) / 5) * 5; // snap to 5°
            last.current = { rotation: deg };
            onLocalUpdate(last.current);
        };

        const endRotate = () => {
            if (!rotating.current) return;
            rotating.current = false;
            if (last.current.rotation != null) onCommitUpdate(last.current);
        };

        const rotate90 = () => {
            const next = (Math.round(rot / 90) * 90 + 90) % 360;
            onLocalUpdate({ rotation: next });
            onCommitUpdate({ rotation: next });
        };

        const radius = table.shape === 'square' ? '10%' : '50%';
        const fill = table.is_head
            ? 'bg-med-gold/25 border-med-gold'
            : 'bg-med-terracotta/20 border-med-terracotta/50';

        return (
            <div
                ref={containerRef}
                className="absolute touch-none select-none"
                style={{ left: x, top: y, width: w, height: h }}
            >
                {/* Rotating group: chairs + table body + handles */}
                <div
                    className="absolute inset-0"
                    style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
                >
                    {/* Chairs */}
                    {chairs.map((c, i) => (
                        <div
                            key={i}
                            className="absolute rounded-md bg-med-olive/40"
                            style={{
                                width: CHAIR,
                                height: CHAIR,
                                left: c.x - CHAIR / 2,
                                top: c.y - CHAIR / 2,
                            }}
                        />
                    ))}
                    {/* Table body (drag target) */}
                    <div
                        className={`absolute inset-0 border-2 flex items-center justify-center cursor-grab active:cursor-grabbing ${fill} ${selected ? 'ring-2 ring-med-ink ring-offset-2' : ''
                            }`}
                        style={{ borderRadius: radius }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                    >
                        <div
                            className="text-center leading-tight pointer-events-none"
                            style={{ transform: `rotate(${-rot}deg)` }}
                        >
                            <div className="font-semibold text-med-ink text-sm">
                                {table.label || table.id}
                            </div>
                            <div className="text-[10px] text-med-ink/50">
                                {assigned}/{table.seats}
                            </div>
                        </div>
                    </div>
                    {/* Rotation handle */}
                    {selected && (
                        <>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 bg-med-ink/30"
                                style={{ width: 2, height: 18, top: -18 }}
                            />
                            <div
                                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-med-ink z-10"
                                style={{ top: -26, cursor: 'grab' }}
                                onPointerDown={startRotate}
                                onPointerMove={onRotateMove}
                                onPointerUp={endRotate}
                                title="Rotar libremente"
                            />
                        </>
                    )}
                    {/* Edge & corner resize handles (rotate with the table) */}
                    {selected &&
                        HANDLES.map((hnd) => (
                            <div
                                key={hnd.dir}
                                className="absolute w-2.5 h-2.5 rounded-full bg-white border-2 border-med-ink z-10"
                                style={{
                                    left: `${hnd.lx}%`,
                                    top: `${hnd.ly}%`,
                                    transform: 'translate(-50%, -50%)',
                                    cursor: hnd.cursor,
                                }}
                                onPointerDown={(e) => startResize(e, hnd.dir)}
                                onPointerMove={onResizeMove}
                                onPointerUp={endResize}
                            />
                        ))}
                </div>
                {/* Quick actions toolbar (below the table, clear of the rotation handle) */}
                {selected && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-md border border-med-olive/15 px-1.5 py-1 z-30"
                        style={{ top: h + 42 }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={rotate90}
                            className="p-1.5 rounded-md text-med-ink/60 hover:bg-med-olive/10 hover:text-med-olive transition"
                            title="Rotar 90°"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDuplicate}
                            className="p-1.5 rounded-md text-med-ink/60 hover:bg-med-olive/10 hover:text-med-olive transition"
                            title="Duplicar mesa"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 rounded-md text-med-ink/60 hover:bg-med-terracotta/10 hover:text-med-terracotta transition"
                            title="Eliminar mesa"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

function TableEditor({
    table,
    assignedGuests,
    unassigned,
    onChangeLocal,
    onCommit,
    onDelete,
    onDuplicate,
    onAssign,
    onUnassign,
}: {
    table: SeatingTable;
    assignedGuests: Guest[];
    unassigned: Guest[];
    onChangeLocal: (patch: Partial<SeatingTable>) => void;
    onCommit: (patch: Partial<SeatingTable>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onAssign: (guestId: number) => void;
    onUnassign: (guestId: number) => void;
}) {
    const seats = table.seats;
    const over = assignedGuests.length > seats;

    return (
        <div className="bg-white rounded-xl border border-med-olive/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-med-ink flex items-center gap-2">
                    {table.is_head && <Crown className="w-4 h-4 text-med-gold" />}
                    {table.label || `Mesa ${table.id}`}
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onDuplicate}
                        className="text-med-ink/40 hover:text-med-olive transition"
                        title="Duplicar mesa (forma, tamaño y sillas)"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-med-ink/40 hover:text-med-terracotta transition"
                        title="Eliminar mesa"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Número / nombre">
                    <input
                        value={table.label ?? ''}
                        onChange={(e) => onChangeLocal({ label: e.target.value })}
                        onBlur={(e) => onCommit({ label: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                    />
                </Field>
                <Field label="Forma">
                    <select
                        value={table.shape}
                        onChange={(e) => {
                            const shape = e.target.value as TableShape;
                            const dims = applyShape(shape, num(table.width), num(table.height));
                            const patch: Partial<SeatingTable> = { shape, ...dims };
                            onChangeLocal(patch);
                            onCommit(patch);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                    >
                        <option value="oval">Ovalada</option>
                        <option value="circle">Circular</option>
                        <option value="square">Cuadrada</option>
                    </select>
                </Field>
                <Field label="Sillas">
                    <NumberInput
                        value={table.seats}
                        min={0}
                        onChangeLocal={(v) => onChangeLocal({ seats: v })}
                        onCommit={(v) => onCommit({ seats: v })}
                    />
                </Field>
                <Field label="Presidencial">
                    <button
                        onClick={() => onCommit({ is_head: !table.is_head })}
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm transition ${table.is_head
                                ? 'bg-med-gold/15 border-med-gold text-med-gold'
                                : 'border-med-olive/20 text-med-ink/60 hover:bg-med-olive/5'
                            }`}
                    >
                        {table.is_head ? 'Sí' : 'No'}
                    </button>
                </Field>
                <Field label="Ancho">
                    <NumberInput
                        value={num(table.width)}
                        min={50}
                        onChangeLocal={(v) => onChangeLocal({ width: v })}
                        onCommit={(v) => onCommit({ width: v })}
                    />
                </Field>
                <Field label="Alto">
                    <NumberInput
                        value={num(table.height)}
                        min={50}
                        onChangeLocal={(v) => onChangeLocal({ height: v })}
                        onCommit={(v) => onCommit({ height: v })}
                    />
                </Field>
            </div>

            {/* Guests of this table */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-med-ink/50">
                        Invitados
                    </span>
                    <span className={`text-xs ${over ? 'text-med-terracotta' : 'text-med-ink/40'}`}>
                        {assignedGuests.length}/{seats}
                    </span>
                </div>
                <ul className="space-y-1 mb-3">
                    {assignedGuests.map((g) => (
                        <li
                            key={g.id}
                            className="flex items-center justify-between text-sm bg-med-cream/60 rounded-lg px-3 py-1.5"
                        >
                            <span className="truncate">{g.name}</span>
                            <button
                                onClick={() => onUnassign(g.id)}
                                className="text-med-ink/30 hover:text-med-terracotta transition shrink-0"
                                title="Quitar de la mesa"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </li>
                    ))}
                    {assignedGuests.length === 0 && (
                        <li className="text-sm text-med-ink/40 px-1">Sin invitados aún.</li>
                    )}
                </ul>

                <label className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-med-olive shrink-0" />
                    <select
                        value=""
                        onChange={(e) => {
                            const id = Number(e.target.value);
                            if (id) onAssign(id);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                    >
                        <option value="">Añadir invitado…</option>
                        {unassigned.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                                {g.party_group ? ` · ${g.party_group}` : ''}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-med-ink/50 mb-1">
                {label}
            </span>
            {children}
        </label>
    );
}

function NumberInput({
    value,
    min,
    onChangeLocal,
    onCommit,
}: {
    value: number;
    min?: number;
    onChangeLocal: (v: number) => void;
    onCommit: (v: number) => void;
}) {
    return (
        <input
            type="number"
            min={min}
            value={value}
            onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) onChangeLocal(v);
            }}
            onBlur={(e) => {
                let v = parseInt(e.target.value, 10);
                if (!Number.isFinite(v)) v = min ?? 0;
                if (min != null && v < min) v = min;
                onCommit(v);
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-med-olive/20 focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
        />
    );
}
