import type { ComponentType } from 'react';
import {
  CalendarHeart,
  Users,
  CheckCircle2,
  Gift,
  Wallet,
  Scale,
  ListChecks,
  Utensils,
  Armchair,
  Bus,
  Clock,
  XCircle,
  Coins,
  Table,
} from 'lucide-react';
import {
  EXPECTED_GUESTS,
  EXPECTED_ADULTS,
  EXPECTED_CHILDREN,
  WEDDING_DATE,
} from '../config';
import {
  type Guest,
  type BudgetItem,
  type Task,
  type Rsvp,
  type SeatingTable,
  type RsvpStatus,
  type BusTrip,
  type TaskStatus,
  type TaskPriority,
  type Payer,
  RSVP_STATUS_LABELS,
  BUS_TRIP_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_PRIORITY_LABELS,
  PAYER_LABELS,
  isConfirmed,
  toAmount,
} from '../types';

export interface DashboardData {
  guests: Guest[];
  budget: BudgetItem[];
  tasks: Task[];
  rsvps: Rsvp[];
  tables: SeatingTable[];
}

export type Accent = 'ink' | 'olive' | 'terracotta' | 'gold';

export interface MetricDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: Accent;
  compute: (d: DashboardData) => { value: string; hint?: string };
}

export interface SeriesDef {
  id: string;
  label: string;
  unit: 'count' | 'eur';
  compute: (d: DashboardData) => { name: string; value: number }[];
}

export interface ListDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  compute: (d: DashboardData) => {
    id: number;
    primary: string;
    secondary: string;
    italic?: boolean;
  }[];
}

const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const NO_DIET = /^(no|ninguna|ninguno|nada|-|n\/a)$/i;

const confirmedGuests = (d: DashboardData) =>
  d.guests.filter((g) => isConfirmed(g.rsvp_status));
const gifts = (d: DashboardData) =>
  d.guests.reduce((s, g) => s + toAmount(g.amount_paid), 0);
const budgetActual = (d: DashboardData) =>
  d.budget.reduce((s, i) => s + toAmount(i.actual), 0);
const budgetPaid = (d: DashboardData) =>
  d.budget.reduce((s, i) => s + toAmount(i.paid), 0);
const daysLeft = () =>
  Math.max(0, Math.ceil((new Date(WEDDING_DATE).getTime() - Date.now()) / 86400000));

// ---- Metrics (KPI cards) ----
export const METRICS: MetricDef[] = [
  {
    id: 'days_left',
    label: 'Cuenta atrás',
    icon: CalendarHeart,
    accent: 'gold',
    compute: () => {
      const d = daysLeft();
      return {
        value: d === 0 ? '¡Hoy!' : `${d} días`,
        hint: new Date(WEDDING_DATE).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };
    },
  },
  {
    id: 'expected',
    label: 'Invitados esperados',
    icon: Users,
    accent: 'ink',
    compute: () => ({
      value: String(EXPECTED_GUESTS),
      hint: `${EXPECTED_ADULTS} adultos · ${EXPECTED_CHILDREN} niños`,
    }),
  },
  {
    id: 'confirmed',
    label: 'Confirmados',
    icon: CheckCircle2,
    accent: 'olive',
    compute: (d) => {
      const c = confirmedGuests(d).length;
      const pct = EXPECTED_GUESTS ? Math.round((c / EXPECTED_GUESTS) * 100) : 0;
      return { value: `${c} / ${EXPECTED_GUESTS}`, hint: `${pct}% de los esperados` };
    },
  },
  {
    id: 'paid_guests',
    label: 'Han pagado',
    icon: Gift,
    accent: 'terracotta',
    compute: (d) => {
      const confirmed = confirmedGuests(d);
      const paid = confirmed.filter((g) => g.has_paid).length;
      const pct = confirmed.length
        ? Math.round((paid / confirmed.length) * 100)
        : 0;
      return { value: `${paid} / ${confirmed.length}`, hint: `${pct}% de los confirmados` };
    },
  },
  {
    id: 'gifts',
    label: 'Regalos recibidos',
    icon: Gift,
    accent: 'gold',
    compute: (d) => ({ value: eur.format(gifts(d)), hint: 'Aportaciones registradas' }),
  },
  {
    id: 'budget_total',
    label: 'Coste total',
    icon: Wallet,
    accent: 'ink',
    compute: (d) => ({ value: eur.format(budgetActual(d)), hint: 'Gastos definitivos' }),
  },
  {
    id: 'budget_pending',
    label: 'Presupuesto pendiente',
    icon: Wallet,
    accent: 'terracotta',
    compute: (d) => ({
      value: eur.format(budgetActual(d) - budgetPaid(d)),
      hint: `de ${eur.format(budgetActual(d))} totales`,
    }),
  },
  {
    id: 'balance',
    label: 'Balance',
    icon: Scale,
    accent: 'olive',
    compute: (d) => {
      const b = gifts(d) - budgetActual(d);
      return { value: eur.format(b), hint: b >= 0 ? 'Cubierto' : 'Falta por cubrir' };
    },
  },
  {
    id: 'tasks_done',
    label: 'Tareas hechas',
    icon: ListChecks,
    accent: 'olive',
    compute: (d) => {
      const total = d.tasks.length;
      const done = d.tasks.filter((t) => t.status === 'done').length;
      return {
        value: `${done} / ${total}`,
        hint: total ? `${Math.round((done / total) * 100)}% completado` : 'Sin tareas',
      };
    },
  },
  {
    id: 'dietary',
    label: 'Con restricciones',
    icon: Utensils,
    accent: 'ink',
    compute: (d) => ({
      value: String(
        d.guests.filter(
          (g) => g.dietary && g.dietary.trim() && !NO_DIET.test(g.dietary.trim()),
        ).length,
      ),
      hint: 'Alergias / dietas especiales',
    }),
  },
  {
    id: 'unseated',
    label: 'Sin mesa',
    icon: Armchair,
    accent: 'terracotta',
    compute: (d) => ({
      value: String(d.guests.filter((g) => g.table_id == null).length),
      hint: 'Invitados por sentar',
    }),
  },
  {
    id: 'using_bus',
    label: 'Usan autobús',
    icon: Bus,
    accent: 'olive',
    compute: (d) => ({
      value: String(
        d.guests.filter((g) => g.bus_trip && g.bus_trip !== 'none').length,
      ),
      hint: 'Personas en autobús',
    }),
  },
  {
    id: 'pending_rsvp',
    label: 'Sin responder',
    icon: Clock,
    accent: 'ink',
    compute: (d) => ({
      value: String(d.guests.filter((g) => g.rsvp_status === 'pending').length),
      hint: 'Pendientes de confirmar',
    }),
  },
  {
    id: 'declined',
    label: 'No asisten',
    icon: XCircle,
    accent: 'terracotta',
    compute: (d) => ({
      value: String(d.guests.filter((g) => g.rsvp_status === 'no').length),
      hint: 'Han declinado',
    }),
  },
  {
    id: 'avg_gift',
    label: 'Aportación media',
    icon: Coins,
    accent: 'gold',
    compute: (d) => {
      const payers = d.guests.filter((g) => toAmount(g.amount_paid) > 0);
      const total = payers.reduce((s, g) => s + toAmount(g.amount_paid), 0);
      return {
        value: eur.format(payers.length ? total / payers.length : 0),
        hint: 'Por invitado que aporta',
      };
    },
  },
  {
    id: 'overdue_tasks',
    label: 'Tareas vencidas',
    icon: Clock,
    accent: 'terracotta',
    compute: (d) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const n = d.tasks.filter(
        (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < today,
      ).length;
      return { value: String(n), hint: 'Fecha límite pasada' };
    },
  },
  {
    id: 'tables_count',
    label: 'Mesas',
    icon: Table,
    accent: 'olive',
    compute: (d) => ({
      value: String(d.tables.length),
      hint: `${d.tables.reduce((s, t) => s + (t.seats || 0), 0)} plazas`,
    }),
  },
];

// ---- Series (charts) ----
export const SERIES: SeriesDef[] = [
  {
    id: 'status',
    label: 'Estado de confirmaciones',
    unit: 'count',
    compute: (d) => {
      const counts = d.guests.reduce<Record<string, number>>((acc, g) => {
        acc[g.rsvp_status] = (acc[g.rsvp_status] ?? 0) + 1;
        return acc;
      }, {});
      return (Object.keys(RSVP_STATUS_LABELS) as RsvpStatus[])
        .map((k) => ({ name: RSVP_STATUS_LABELS[k], value: counts[k] ?? 0 }))
        .filter((x) => x.value > 0);
    },
  },
  {
    id: 'adults_children',
    label: 'Adultos vs Niños (confirmados)',
    unit: 'count',
    compute: (d) => {
      const base = confirmedGuests(d).length ? confirmedGuests(d) : d.guests;
      return [
        { name: 'Adultos', value: base.filter((g) => g.guest_type === 'adult').length },
        { name: 'Niños', value: base.filter((g) => g.guest_type === 'child').length },
      ].filter((x) => x.value > 0);
    },
  },
  {
    id: 'attendance',
    label: 'Asistencia por evento',
    unit: 'count',
    compute: (d) => {
      const c = confirmedGuests(d);
      return [
        {
          name: 'Ceremonia',
          value: c.filter(
            (g) => g.rsvp_status === 'yes_all' || g.rsvp_status === 'only_ceremony',
          ).length,
        },
        {
          name: 'Cena',
          value: c.filter(
            (g) => g.rsvp_status === 'yes_all' || g.rsvp_status === 'only_dinner',
          ).length,
        },
      ].filter((x) => x.value > 0);
    },
  },
  {
    id: 'bus',
    label: 'Autobús por trayecto',
    unit: 'count',
    compute: (d) => {
      const counts: Record<BusTrip, number> = {
        one_way: 0,
        round_trip_1: 0,
        round_trip_2: 0,
        return_1: 0,
        return_2: 0,
        none: 0,
      };
      for (const g of d.guests) {
        const t = (g.bus_trip ?? 'none') as BusTrip;
        if (counts[t] != null) counts[t]++;
      }
      return (
        ['one_way', 'round_trip_1', 'round_trip_2', 'return_1', 'return_2'] as BusTrip[]
      )
        .map((t) => ({ name: BUS_TRIP_LABELS[t], value: counts[t] }))
        .filter((x) => x.value > 0);
    },
  },
  {
    id: 'budget_by_category',
    label: 'Coste por categoría',
    unit: 'eur',
    compute: (d) => {
      const map = new Map<string, number>();
      for (const i of d.budget) {
        map.set(i.category, (map.get(i.category) ?? 0) + toAmount(i.actual));
      }
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .filter((x) => x.value > 0);
    },
  },
  {
    id: 'budget_paid_pending',
    label: 'Presupuesto: pagado vs pendiente',
    unit: 'eur',
    compute: (d) => {
      const actual = budgetActual(d);
      const paid = budgetPaid(d);
      return [
        { name: 'Pagado', value: paid },
        { name: 'Pendiente', value: Math.max(actual - paid, 0) },
      ];
    },
  },
  {
    id: 'tasks_by_status',
    label: 'Tareas por estado',
    unit: 'count',
    compute: (d) =>
      TASK_STATUS_ORDER.map((s) => ({
        name: TASK_STATUS_LABELS[s],
        value: d.tasks.filter((t) => t.status === s).length,
      })).filter((x) => x.value > 0),
  },
  {
    id: 'guests_by_group',
    label: 'Invitados por grupo',
    unit: 'count',
    compute: (d) => {
      const map = new Map<string, number>();
      for (const g of d.guests) {
        const key = g.party_group?.trim() || 'Sin grupo';
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    },
  },
  {
    id: 'tasks_by_priority',
    label: 'Tareas por prioridad',
    unit: 'count',
    compute: (d) =>
      (['high', 'medium', 'low'] as TaskPriority[])
        .map((p) => ({
          name: TASK_PRIORITY_LABELS[p],
          value: d.tasks.filter((t) => t.priority === p).length,
        }))
        .filter((x) => x.value > 0),
  },
  {
    id: 'tasks_by_assignee',
    label: 'Tareas por responsable',
    unit: 'count',
    compute: (d) => {
      const map = new Map<string, number>();
      for (const t of d.tasks) {
        const key = t.assignee
          ? PAYER_LABELS[t.assignee as Payer] ?? t.assignee
          : 'Sin asignar';
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()].map(([name, value]) => ({ name, value }));
    },
  },
];

// ---- Lists ----
export const LISTS: ListDef[] = [
  {
    id: 'messages',
    label: 'Mensajes de los invitados',
    icon: Gift,
    compute: (d) =>
      d.rsvps
        .filter((r) => r.message && r.message.trim())
        .map((r) => ({
          id: r.id,
          primary: r.message!.trim(),
          secondary: r.name,
          italic: true,
        })),
  },
  {
    id: 'songs',
    label: 'Canciones pedidas',
    icon: Gift,
    compute: (d) =>
      d.rsvps
        .filter((r) => r.songs && r.songs.trim())
        .map((r) => ({ id: r.id, primary: r.songs!.trim(), secondary: r.name })),
  },
];

export const METRIC_MAP = Object.fromEntries(METRICS.map((m) => [m.id, m]));
export const SERIES_MAP = Object.fromEntries(SERIES.map((s) => [s.id, s]));
export const LIST_MAP = Object.fromEntries(LISTS.map((l) => [l.id, l]));

// ---- Custom blocks (user-defined) ----
export interface CatField {
  id: string;
  label: string;
  get: (row: unknown) => string;
}
export interface NumField {
  id: string;
  label: string;
  get: (row: unknown) => number;
  money?: boolean;
}
export interface SourceMeta {
  id: 'guests' | 'tasks' | 'budget';
  label: string;
  rows: (d: DashboardData) => unknown[];
  categorical: CatField[];
  numeric: NumField[];
}

export const SOURCES: SourceMeta[] = [
  {
    id: 'guests',
    label: 'Invitados',
    rows: (d) => d.guests,
    categorical: [
      { id: 'status', label: 'Estado', get: (r) => RSVP_STATUS_LABELS[(r as Guest).rsvp_status] ?? (r as Guest).rsvp_status },
      { id: 'type', label: 'Adulto/Niño', get: (r) => ((r as Guest).guest_type === 'child' ? 'Niño' : 'Adulto') },
      { id: 'bus', label: 'Autobús', get: (r) => BUS_TRIP_LABELS[((r as Guest).bus_trip ?? 'none') as BusTrip] },
      { id: 'paid', label: 'Pagado', get: (r) => ((r as Guest).has_paid ? 'Sí' : 'No') },
      { id: 'group', label: 'Grupo', get: (r) => ((r as Guest).party_group?.trim() || 'Sin grupo') },
      { id: 'seated', label: 'Mesa', get: (r) => ((r as Guest).table_id != null ? 'Con mesa' : 'Sin mesa') },
      {
        id: 'diet',
        label: 'Restricciones',
        get: (r) => {
          const dt = (r as Guest).dietary?.trim();
          return dt && !NO_DIET.test(dt) ? 'Con restricción' : 'Sin restricción';
        },
      },
      {
        id: 'diet_detail',
        label: 'Restricción (detalle)',
        get: (r) => {
          const dt = (r as Guest).dietary?.trim();
          return dt && !NO_DIET.test(dt) ? dt : 'Sin restricción';
        },
      },
      { id: 'extra', label: 'Tipo de invitado', get: (r) => ((r as Guest).is_extra ? 'Acompañante' : 'Principal') },
      { id: 'source', label: 'Origen', get: (r) => ((r as Guest).source === 'rsvp' ? 'Del formulario' : 'Añadido a mano') },
    ],
    numeric: [
      { id: 'amount', label: 'Aportación (€)', get: (r) => toAmount((r as Guest).amount_paid), money: true },
    ],
  },
  {
    id: 'tasks',
    label: 'Tareas',
    rows: (d) => d.tasks,
    categorical: [
      { id: 'status', label: 'Estado', get: (r) => TASK_STATUS_LABELS[(r as Task).status] ?? (r as Task).status },
      { id: 'priority', label: 'Prioridad', get: (r) => TASK_PRIORITY_LABELS[(r as Task).priority] ?? (r as Task).priority },
      {
        id: 'assignee',
        label: 'Responsable',
        get: (r) => {
          const a = (r as Task).assignee;
          return a ? PAYER_LABELS[a as Payer] ?? a : 'Sin asignar';
        },
      },
      {
        id: 'due',
        label: 'Fecha límite',
        get: (r) => {
          const t = r as Task;
          if (!t.due_date) return 'Sin fecha';
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return new Date(t.due_date) < today && t.status !== 'done'
            ? 'Vencida'
            : 'Con fecha';
        },
      },
    ],
    numeric: [],
  },
  {
    id: 'budget',
    label: 'Presupuesto',
    rows: (d) => d.budget,
    categorical: [
      { id: 'category', label: 'Categoría', get: (r) => (r as BudgetItem).category },
      { id: 'payer', label: 'Pagador', get: (r) => PAYER_LABELS[((r as BudgetItem).payer || 'comun') as Payer] ?? String((r as BudgetItem).payer) },
    ],
    numeric: [
      { id: 'actual', label: 'Coste (€)', get: (r) => toAmount((r as BudgetItem).actual), money: true },
      { id: 'paid', label: 'Pagado (€)', get: (r) => toAmount((r as BudgetItem).paid), money: true },
      { id: 'pending', label: 'Pendiente (€)', get: (r) => toAmount((r as BudgetItem).actual) - toAmount((r as BudgetItem).paid), money: true },
    ],
  },
];
export const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

export interface CustomStatSpec {
  source: string;
  agg: 'count' | 'sum' | 'avg';
  field?: string;
  filterField?: string;
  filterValue?: string;
  label: string;
}
export interface CustomChartSpec {
  source: string;
  groupBy: string;
  measure: 'count' | 'sum';
  field?: string;
  label: string;
}

function num2(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('es-ES');
}

export function computeCustomStat(
  d: DashboardData,
  spec: CustomStatSpec,
): { value: string; hint?: string } {
  const src = SOURCE_MAP[spec.source];
  if (!src) return { value: '—' };
  let rows = src.rows(d);
  if (spec.filterField && spec.filterValue) {
    const cf = src.categorical.find((c) => c.id === spec.filterField);
    if (cf) rows = rows.filter((r) => cf.get(r) === spec.filterValue);
  }
  if (spec.agg === 'count') return { value: String(rows.length) };
  const nf = src.numeric.find((n) => n.id === spec.field);
  if (!nf) return { value: String(rows.length) };
  const total = rows.reduce<number>((s, r) => s + nf.get(r), 0);
  const val = spec.agg === 'avg' ? (rows.length ? total / rows.length : 0) : total;
  return { value: nf.money ? eur.format(val) : num2(val) };
}

export function computeCustomChart(
  d: DashboardData,
  spec: CustomChartSpec,
): { name: string; value: number }[] {
  const src = SOURCE_MAP[spec.source];
  if (!src) return [];
  const gb = src.categorical.find((c) => c.id === spec.groupBy);
  if (!gb) return [];
  const nf = spec.measure === 'sum' ? src.numeric.find((n) => n.id === spec.field) : undefined;
  const map = new Map<string, number>();
  for (const r of src.rows(d)) {
    const key = gb.get(r) || '—';
    map.set(key, (map.get(key) ?? 0) + (nf ? nf.get(r) : 1));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((x) => x.value !== 0);
}

export function customChartIsEur(spec: CustomChartSpec): boolean {
  if (spec.measure !== 'sum') return false;
  const src = SOURCE_MAP[spec.source];
  return !!src?.numeric.find((n) => n.id === spec.field)?.money;
}

/** Distinct values of a categorical field (for the filter picker). */
export function distinctValues(
  d: DashboardData,
  source: string,
  fieldId: string,
): string[] {
  const src = SOURCE_MAP[source];
  if (!src) return [];
  const cf = src.categorical.find((c) => c.id === fieldId);
  if (!cf) return [];
  const set = new Set<string>();
  for (const r of src.rows(d)) set.add(cf.get(r));
  return [...set].sort();
}

// ---- Widget layout ----
export type ChartType = 'pie' | 'donut' | 'bar';
export type WidgetSize = 'sm' | 'md' | 'lg';

export type Widget =
  | { id: string; kind: 'stat'; ref: string; size?: WidgetSize }
  | { id: string; kind: 'chart'; ref: string; chart: ChartType; size?: WidgetSize }
  | { id: string; kind: 'list'; ref: string; size?: WidgetSize }
  | { id: string; kind: 'custom-stat'; spec: CustomStatSpec; size?: WidgetSize }
  | {
      id: string;
      kind: 'custom-chart';
      spec: CustomChartSpec;
      chart: ChartType;
      size?: WidgetSize;
    };

// Distributive omit so each union member keeps its own extra props (e.g. chart).
type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never;
export type WidgetDraft = DistributiveOmit<Widget, 'id'>;

export const DEFAULT_LAYOUT: Widget[] = [
  { id: 'w1', kind: 'stat', ref: 'days_left' },
  { id: 'w2', kind: 'stat', ref: 'confirmed' },
  { id: 'w3', kind: 'stat', ref: 'gifts' },
  { id: 'w4', kind: 'stat', ref: 'budget_pending' },
  { id: 'w5', kind: 'chart', ref: 'status', chart: 'pie' },
  { id: 'w6', kind: 'chart', ref: 'attendance', chart: 'bar' },
  { id: 'w7', kind: 'chart', ref: 'budget_paid_pending', chart: 'bar' },
  { id: 'w8', kind: 'chart', ref: 'bus', chart: 'bar' },
  { id: 'w9', kind: 'list', ref: 'messages' },
];

// Settings key used to persist the layout server-side (table `settings`).
export const LAYOUT_KEY = 'dashboard_layout';
const CACHE_KEY = 'boda_dashboard_v1';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const SIZES: WidgetSize[] = ['sm', 'md', 'lg'];
const CHARTS: ChartType[] = ['pie', 'donut', 'bar'];

function isStatSpec(s: unknown): s is CustomStatSpec {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.source === 'string' &&
    !!SOURCE_MAP[o.source] &&
    (o.agg === 'count' || o.agg === 'sum' || o.agg === 'avg') &&
    typeof o.label === 'string'
  );
}

function isChartSpec(s: unknown): s is CustomChartSpec {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.source === 'string' &&
    !!SOURCE_MAP[o.source] &&
    typeof o.groupBy === 'string' &&
    (o.measure === 'count' || o.measure === 'sum') &&
    typeof o.label === 'string'
  );
}

/** Validates a raw layout, dropping unknown refs and fixing missing fields. */
export function sanitizeLayout(parsed: unknown): Widget[] {
  if (!Array.isArray(parsed)) return [];
  const out: Widget[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const w = raw as Record<string, unknown>;
    const id = typeof w.id === 'string' ? (w.id as string) : uid();
    const ref = typeof w.ref === 'string' ? (w.ref as string) : '';
    const size = SIZES.includes(w.size as WidgetSize)
      ? (w.size as WidgetSize)
      : undefined;
    if (w.kind === 'stat' && METRIC_MAP[ref]) {
      out.push({ id, kind: 'stat', ref, size });
    } else if (w.kind === 'chart' && SERIES_MAP[ref]) {
      const chart = CHARTS.includes(w.chart as ChartType)
        ? (w.chart as ChartType)
        : 'bar';
      out.push({ id, kind: 'chart', ref, chart, size });
    } else if (w.kind === 'list' && LIST_MAP[ref]) {
      out.push({ id, kind: 'list', ref, size });
    } else if (w.kind === 'custom-stat' && isStatSpec(w.spec)) {
      out.push({ id, kind: 'custom-stat', spec: w.spec, size });
    } else if (w.kind === 'custom-chart' && isChartSpec(w.spec)) {
      const chart = CHARTS.includes(w.chart as ChartType)
        ? (w.chart as ChartType)
        : 'bar';
      out.push({ id, kind: 'custom-chart', spec: w.spec, chart, size });
    }
  }
  return out;
}

/** Fast local cache so the dashboard renders instantly before the server responds. */
export function readCache(): Widget[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const layout = sanitizeLayout(JSON.parse(raw));
    return layout.length ? layout : null;
  } catch {
    return null;
  }
}

export function writeCache(layout: Widget[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}
