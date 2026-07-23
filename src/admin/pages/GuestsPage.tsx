import { useEffect, useMemo, useState } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { RefreshCw, Plus, Trash2, Baby, User } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';
import {
    type Guest,
    type RsvpStatus,
    RSVP_STATUS_LABELS,
    toAmount,
} from '../types';

const STATUS_OPTIONS: RsvpStatus[] = [
    'pending',
    'yes_all',
    'only_ceremony',
    'only_dinner',
    'no',
];

const columnHelper = createColumnHelper<Guest>();

export default function GuestsPage() {
    const { data: guests, loading, error, refetch } = useApi<Guest[]>('/api/guests');
    const [syncing, setSyncing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const updateGuest = async (id: number, patch: Partial<Guest>) => {
        setActionError(null);
        try {
            await apiFetch(`/api/guests?id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const deleteGuest = async (id: number) => {
        if (!confirm('¿Eliminar este invitado?')) return;
        setActionError(null);
        try {
            await apiFetch(`/api/guests?id=${id}`, { method: 'DELETE' });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const addGuest = async () => {
        setActionError(null);
        try {
            await apiFetch('/api/guests', {
                method: 'POST',
                body: JSON.stringify({ name: 'Nuevo invitado' }),
            });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const sync = async () => {
        setSyncing(true);
        setActionError(null);
        try {
            await apiFetch('/api/guests?action=sync', { method: 'POST' });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        } finally {
            setSyncing(false);
        }
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor('name', {
                header: 'Nombre',
                cell: (info) => {
                    const guest = info.row.original;
                    return (
                        <div className="flex items-center gap-2">
                            {guest.is_extra ? (
                                <span className="flex items-center text-med-azure/70 select-none">
                                    <span className="font-mono text-med-olive/30 mr-1">└─</span>
                                    <span title="Acompañante">
                                        {guest.guest_type === 'child' ? (
                                            <Baby className="w-3.5 h-3.5" />
                                        ) : (
                                            <User className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                </span>
                            ) : null}
                            <EditableText
                                value={info.getValue()}
                                onSave={(v) => updateGuest(guest.id, { name: v })}
                            />
                        </div>
                    );
                },
            }),
            columnHelper.accessor('email', {
                header: 'Email',
                cell: (info) => (
                    <EditableText
                        value={info.getValue() ?? ''}
                        placeholder="—"
                        onSave={(v) => updateGuest(info.row.original.id, { email: v })}
                    />
                ),
            }),
            columnHelper.accessor('party_group', {
                header: 'Grupo',
                cell: (info) => (
                    <EditableText
                        value={info.getValue() ?? ''}
                        placeholder="—"
                        onSave={(v) => updateGuest(info.row.original.id, { party_group: v })}
                    />
                ),
            }),
            columnHelper.accessor('guest_type', {
                header: 'Tipo',
                cell: (info) => (
                    <select
                        value={info.getValue()}
                        onChange={(e) =>
                            updateGuest(info.row.original.id, {
                                guest_type: e.target.value as Guest['guest_type'],
                            })
                        }
                        className="bg-transparent text-sm py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                    >
                        <option value="adult">Adulto</option>
                        <option value="child">Niño</option>
                    </select>
                ),
            }),
            columnHelper.accessor('dietary', {
                header: 'Restricciones',
                cell: (info) => (
                    <EditableText
                        value={info.getValue() ?? ''}
                        placeholder="—"
                        onSave={(v) => updateGuest(info.row.original.id, { dietary: v })}
                    />
                ),
            }),
            columnHelper.accessor('rsvp_status', {
                header: 'Confirmación',
                cell: (info) => (
                    <select
                        value={info.getValue()}
                        onChange={(e) =>
                            updateGuest(info.row.original.id, {
                                rsvp_status: e.target.value as RsvpStatus,
                            })
                        }
                        className="bg-transparent text-sm py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                    >
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {RSVP_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                ),
            }),
            columnHelper.accessor('has_paid', {
                header: 'Pagado',
                cell: (info) => (
                    <input
                        type="checkbox"
                        checked={info.getValue()}
                        onChange={(e) =>
                            updateGuest(info.row.original.id, { has_paid: e.target.checked })
                        }
                        className="w-4 h-4 accent-med-olive"
                    />
                ),
            }),
            columnHelper.accessor('amount_paid', {
                header: 'Importe (€)',
                cell: (info) => (
                    <EditableNumber
                        value={toAmount(info.getValue())}
                        onSave={(v) => updateGuest(info.row.original.id, { amount_paid: v })}
                    />
                ),
            }),
            columnHelper.accessor('payment_notes', {
                header: 'Notas',
                cell: (info) => (
                    <EditableText
                        value={info.getValue() ?? ''}
                        placeholder="—"
                        onSave={(v) =>
                            updateGuest(info.row.original.id, { payment_notes: v })
                        }
                    />
                ),
            }),
            columnHelper.display({
                id: 'actions',
                header: '',
                cell: (info) => (
                    <button
                        onClick={() => deleteGuest(info.row.original.id)}
                        className="text-med-ink/30 hover:text-med-terracotta transition"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                ),
            }),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // Order rows so each main guest is immediately followed by its extras
    // (the acompañantes "hang" from the main guest). Manual guests without an
    // RSVP stay on their own. Groups are ordered by party group, then name.
    const orderedGuests = useMemo(() => {
        const list = guests ?? [];
        const mains = list.filter((g) => !g.is_extra);
        const extras = list.filter((g) => g.is_extra);

        const extrasByRsvp = new Map<number, Guest[]>();
        const orphanExtras: Guest[] = [];
        for (const extra of extras) {
            if (extra.rsvp_id != null) {
                const bucket = extrasByRsvp.get(extra.rsvp_id) ?? [];
                bucket.push(extra);
                extrasByRsvp.set(extra.rsvp_id, bucket);
            } else {
                orphanExtras.push(extra);
            }
        }

        const collator = new Intl.Collator('es', { sensitivity: 'base' });
        const byGroupThenName = (a: Guest, b: Guest) =>
            collator.compare(a.party_group ?? '~', b.party_group ?? '~') ||
            collator.compare(a.name, b.name);

        const result: Guest[] = [];
        for (const main of [...mains].sort(byGroupThenName)) {
            result.push(main);
            if (main.rsvp_id != null) {
                const children = (extrasByRsvp.get(main.rsvp_id) ?? []).sort((a, b) =>
                    collator.compare(a.name, b.name),
                );
                result.push(...children);
                extrasByRsvp.delete(main.rsvp_id);
            }
        }
        for (const bucket of extrasByRsvp.values()) result.push(...bucket);
        result.push(...orphanExtras);
        return result;
    }, [guests]);

    const table = useReactTable<Guest>({
        data: orderedGuests,
        columns,
        getRowId: (row) => String(row.id),
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-8">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-serif text-3xl text-med-ink">Invitados</h1>
                    <p className="text-sm text-med-ink/50 mt-1">
                        {guests ? `${guests.length} personas` : 'Cargando…'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={addGuest}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-med-olive/20 text-sm text-med-ink/70 hover:bg-med-olive/5 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir
                    </button>
                    <button
                        onClick={sync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-med-olive text-white text-sm disabled:opacity-50 hover:bg-med-olive/90 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando…' : 'Sincronizar RSVPs'}
                    </button>
                </div>
            </header>

            {actionError && (
                <div className="mb-4 text-sm text-med-terracotta bg-med-terracotta/5 px-4 py-2 rounded-lg">
                    {actionError}
                </div>
            )}

            {error ? (
                <div className="text-med-terracotta">{error}</div>
            ) : loading ? (
                <div className="text-med-ink/40">Cargando invitados…</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-med-olive/10 bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b border-med-olive/10">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="text-left font-semibold text-xs uppercase tracking-wider text-med-ink/50 px-4 py-3 select-none whitespace-nowrap"
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-med-olive/5 hover:bg-med-cream/50 ${row.original.is_extra ? 'bg-med-azure/[0.03]' : ''
                                        }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-2.5 align-middle">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {table.getRowModel().rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-8 text-center text-med-ink/40"
                                    >
                                        No hay invitados todavía. Pulsa «Sincronizar RSVPs» o «Añadir».
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function EditableText({
    value,
    placeholder,
    onSave,
}: {
    value: string;
    placeholder?: string;
    onSave: (value: string) => void;
}) {
    const [draft, setDraft] = useState(value);
    useEffect(() => {
        setDraft(value);
    }, [value]);
    return (
        <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                if (draft !== value) onSave(draft);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-full min-w-[6rem] bg-transparent py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30 focus:px-2"
        />
    );
}

function EditableNumber({
    value,
    onSave,
}: {
    value: number;
    onSave: (value: number) => void;
}) {
    const [draft, setDraft] = useState(String(value));
    useEffect(() => {
        setDraft(String(value));
    }, [value]);
    return (
        <input
            type="number"
            min="0"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                const parsed = parseFloat(draft);
                const next = Number.isFinite(parsed) ? parsed : 0;
                if (next !== value) onSave(next);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-24 bg-transparent py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30 focus:px-2"
        />
    );
}
