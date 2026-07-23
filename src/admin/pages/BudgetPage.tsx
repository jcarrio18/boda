import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';
import {
    type BudgetItem,
    type Guest,
    type Payer,
    PAYER_LABELS,
    toAmount,
} from '../types';

const EUR = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
});

const PAYERS: Payer[] = ['cris', 'joan', 'comun'];

export default function BudgetPage() {
    const {
        data: items,
        loading,
        error,
        refetch,
    } = useApi<BudgetItem[]>('/api/budget');
    const { data: guests } = useApi<Guest[]>('/api/guests');
    const [actionError, setActionError] = useState<string | null>(null);

    const update = async (id: number, patch: Partial<BudgetItem>) => {
        setActionError(null);
        try {
            await apiFetch(`/api/budget?id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const remove = async (id: number) => {
        if (!confirm('¿Eliminar esta partida?')) return;
        setActionError(null);
        try {
            await apiFetch(`/api/budget?id=${id}`, { method: 'DELETE' });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const addItem = async (category: string) => {
        setActionError(null);
        try {
            await apiFetch('/api/budget', {
                method: 'POST',
                body: JSON.stringify({ category, concept: 'Nueva partida' }),
            });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const { grouped, totals, byPayer, giftsReceived } = useMemo(() => {
        const list = items ?? [];
        const groups = new Map<string, BudgetItem[]>();
        for (const item of list) {
            const bucket = groups.get(item.category) ?? [];
            bucket.push(item);
            groups.set(item.category, bucket);
        }

        const totals = list.reduce(
            (acc, i) => {
                acc.actual += toAmount(i.actual);
                acc.paid += toAmount(i.paid);
                return acc;
            },
            { actual: 0, paid: 0 },
        );

        const byPayer = list.reduce<Record<string, number>>((acc, i) => {
            const key = (i.payer as string) || 'comun';
            acc[key] = (acc[key] ?? 0) + toAmount(i.actual);
            return acc;
        }, {});

        const giftsReceived = (guests ?? []).reduce(
            (sum, g) => sum + toAmount(g.amount_paid),
            0,
        );

        return { grouped: groups, totals, byPayer, giftsReceived };
    }, [items, guests]);

    const pending = totals.actual - totals.paid;
    const balance = giftsReceived - totals.actual;

    if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
    if (loading) return <div className="p-8 text-med-ink/40">Cargando presupuesto…</div>;

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="font-serif text-3xl text-med-ink">Presupuesto</h1>
                <p className="text-sm text-med-ink/50 mt-1">
                    Gastos y balance con los regalos recibidos
                </p>
            </header>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
                <MiniCard
                    label="Coste total"
                    value={EUR.format(totals.actual)}
                    icon={<TrendingUp className="w-4 h-4" />}
                    accent="ink"
                />
                <MiniCard
                    label="Pagado"
                    value={EUR.format(totals.paid)}
                    icon={<Wallet className="w-4 h-4" />}
                    accent="olive"
                />
                <MiniCard
                    label="Pendiente"
                    value={EUR.format(pending)}
                    icon={<TrendingDown className="w-4 h-4" />}
                    accent="terracotta"
                />
                <MiniCard
                    label="Regalos recibidos"
                    value={EUR.format(giftsReceived)}
                    icon={<Gift className="w-4 h-4" />}
                    accent="gold"
                />
                <MiniCard
                    label="Balance"
                    value={EUR.format(balance)}
                    accent={balance >= 0 ? 'olive' : 'terracotta'}
                    hint={balance >= 0 ? 'Cubierto' : 'Falta por cubrir'}
                />
            </div>

            {/* Payer breakdown */}
            <div className="flex flex-wrap gap-3 mb-6">
                {PAYERS.map((p) => (
                    <div
                        key={p}
                        className="text-sm bg-white border border-med-olive/10 rounded-lg px-4 py-2"
                    >
                        <span className="text-med-ink/50">{PAYER_LABELS[p]}: </span>
                        <span className="font-semibold text-med-ink">
                            {EUR.format(byPayer[p] ?? 0)}
                        </span>
                    </div>
                ))}
            </div>

            {actionError && (
                <div className="mb-4 text-sm text-med-terracotta bg-med-terracotta/5 px-4 py-2 rounded-lg">
                    {actionError}
                </div>
            )}

            {/* Grouped tables */}
            <div className="space-y-6">
                {[...grouped.entries()].map(([category, rows]) => {
                    const subtotal = rows.reduce((s, r) => s + toAmount(r.actual), 0);
                    return (
                        <div
                            key={category}
                            className="rounded-xl border border-med-olive/10 bg-white overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-4 py-3 bg-med-olive/5 border-b border-med-olive/10">
                                <h2 className="font-serif text-lg text-med-ink">{category}</h2>
                                <span className="text-sm text-med-ink/60">
                                    Subtotal: <span className="font-semibold">{EUR.format(subtotal)}</span>
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-wider text-med-ink/40 border-b border-med-olive/10">
                                            <th className="px-4 py-2 font-semibold">Concepto</th>
                                            <th className="px-4 py-2 font-semibold">Coste</th>
                                            <th className="px-4 py-2 font-semibold">Pagado</th>
                                            <th className="px-4 py-2 font-semibold">Pendiente</th>
                                            <th className="px-4 py-2 font-semibold">Pagador</th>
                                            <th className="px-4 py-2 font-semibold">Notas</th>
                                            <th className="px-4 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((item) => {
                                            const itemPending = toAmount(item.actual) - toAmount(item.paid);
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="border-b border-med-olive/5 hover:bg-med-cream/50"
                                                >
                                                    <td className="px-4 py-2">
                                                        <EditableText
                                                            value={item.concept}
                                                            onSave={(v) => update(item.id, { concept: v })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <EditableNumber
                                                            value={toAmount(item.actual)}
                                                            onSave={(v) => update(item.id, { actual: v })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <EditableNumber
                                                            value={toAmount(item.paid)}
                                                            onSave={(v) => update(item.id, { paid: v })}
                                                        />
                                                    </td>
                                                    <td
                                                        className={`px-4 py-2 tabular-nums ${itemPending > 0 ? 'text-med-terracotta' : 'text-med-ink/40'
                                                            }`}
                                                    >
                                                        {EUR.format(itemPending)}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={(item.payer as string) || 'comun'}
                                                            onChange={(e) =>
                                                                update(item.id, { payer: e.target.value as Payer })
                                                            }
                                                            className="bg-transparent py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30"
                                                        >
                                                            {PAYERS.map((p) => (
                                                                <option key={p} value={p}>
                                                                    {PAYER_LABELS[p]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <EditableText
                                                            value={item.notes ?? ''}
                                                            placeholder="—"
                                                            onSave={(v) => update(item.id, { notes: v })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <button
                                                            onClick={() => remove(item.id)}
                                                            className="text-med-ink/30 hover:text-med-terracotta transition"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                onClick={() => addItem(category)}
                                className="flex items-center gap-2 px-4 py-2 text-xs text-med-ink/50 hover:text-med-olive transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Añadir partida a {category}
                            </button>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={() => addItem('Otros')}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg border border-med-olive/20 text-sm text-med-ink/70 hover:bg-med-olive/5 transition"
            >
                <Plus className="w-4 h-4" />
                Nueva categoría / partida
            </button>
        </div>
    );
}

function MiniCard({
    label,
    value,
    hint,
    icon,
    accent = 'ink',
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: ReactNode;
    accent?: 'ink' | 'olive' | 'terracotta' | 'gold';
}) {
    const accentText: Record<string, string> = {
        ink: 'text-med-ink',
        olive: 'text-med-olive',
        terracotta: 'text-med-terracotta',
        gold: 'text-med-gold',
    };
    return (
        <div className="bg-white rounded-xl border border-med-olive/10 p-4">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-med-ink/50">
                {icon}
                {label}
            </div>
            <div className={`text-lg font-serif mt-1 ${accentText[accent]}`}>{value}</div>
            {hint && <div className="text-[11px] text-med-ink/40 mt-0.5">{hint}</div>}
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
            className="w-full min-w-[8rem] bg-transparent py-1 rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30 focus:px-2"
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
            className="w-24 bg-transparent py-1 tabular-nums rounded focus:outline-none focus:ring-1 focus:ring-med-terracotta/30 focus:px-2"
        />
    );
}
