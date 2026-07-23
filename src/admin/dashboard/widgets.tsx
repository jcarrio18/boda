import type { ReactNode, FC } from 'react';
import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { X, Plus, Check, Sparkles, Wand2 } from 'lucide-react';
import {
  type DashboardData,
  type Widget,
  type WidgetDraft,
  type WidgetSize,
  type ChartType,
  type Accent,
  type CustomStatSpec,
  type CustomChartSpec,
  METRIC_MAP,
  SERIES_MAP,
  LIST_MAP,
  METRICS,
  SERIES,
  LISTS,
  SOURCES,
  SOURCE_MAP,
  computeCustomStat,
  computeCustomChart,
  customChartIsEur,
  distinctValues,
} from './registry';

const COLORS = ['#5A5A40', '#C05A3E', '#7BA4B1', '#B08D57', '#9CA37E', '#A8763E', '#7A8450', '#C99'];

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const ACCENT: Record<Accent, string> = {
  ink: 'text-med-ink/60 bg-med-ink/5',
  olive: 'text-med-olive bg-med-olive/10',
  terracotta: 'text-med-terracotta bg-med-terracotta/10',
  gold: 'text-med-gold bg-med-gold/10',
};

/**
 * Column + row span per size on a fixed-unit grid so sizes are proportional in
 * both axes: S = 1x1, M = 2x2, L = 4x4 (two S high = one M, two M = one L).
 */
export function widgetSpan(w: Widget): string {
  const size =
    w.size ?? (w.kind === 'stat' ? 'sm' : w.kind === 'list' ? 'lg' : 'md');
  if (size === 'sm') return 'col-span-1 row-span-1';
  if (size === 'lg')
    return 'col-span-1 sm:col-span-2 xl:col-span-4 row-span-4';
  return 'col-span-1 sm:col-span-2 row-span-2';
}

function EmptyChart() {
  return (
    <div className="flex-1 flex items-center justify-center text-med-ink/30 text-sm">
      Sin datos todavía
    </div>
  );
}

function StatView({ data, refId }: { data: DashboardData; refId: string }) {
  const def = METRIC_MAP[refId];
  if (!def) return null;
  const { value, hint } = def.compute(data);
  const Icon = def.icon;
  return (
    <div className="h-full flex flex-col justify-center">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${ACCENT[def.accent]}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-serif text-med-ink">{value}</div>
      <div className="text-xs uppercase tracking-wider text-med-ink/50 mt-1">
        {def.label}
      </div>
      {hint && <div className="text-xs text-med-ink/40 mt-1">{hint}</div>}
    </div>
  );
}

function ChartLegend({
  series,
  fmt,
}: {
  series: { name: string; value: number }[];
  fmt: (v: number) => string;
}) {
  return (
    <div className="shrink-0 flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[11px]">
      {series.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: COLORS[i % COLORS.length] }}
          />
          <span className="text-med-ink/80">{s.name}</span>
          <span className="text-med-ink/40">{fmt(s.value)}</span>
        </span>
      ))}
    </div>
  );
}

function ChartBody({
  series,
  isEur,
  chart,
}: {
  series: { name: string; value: number }[];
  isEur: boolean;
  chart: ChartType;
}) {
  const fmt = (v: number) => (isEur ? EUR.format(v) : String(v));
  if (series.length === 0) return <EmptyChart />;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0">
        {chart === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {series.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={series}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chart === 'donut' ? '55%' : 0}
                outerRadius="85%"
              >
                {series.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ChartLegend series={series} fmt={fmt} />
    </div>
  );
}

function ChartView({
  data,
  refId,
  chart,
}: {
  data: DashboardData;
  refId: string;
  chart: ChartType;
}) {
  const def = SERIES_MAP[refId];
  if (!def) return null;
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-med-ink/50 mb-3 shrink-0">
        {def.label}
      </h2>
      <ChartBody series={def.compute(data)} isEur={def.unit === 'eur'} chart={chart} />
    </div>
  );
}

function CustomStatView({
  data,
  spec,
}: {
  data: DashboardData;
  spec: CustomStatSpec;
}) {
  const { value } = computeCustomStat(data, spec);
  return (
    <div className="h-full flex flex-col justify-center">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-med-olive bg-med-olive/10">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="text-2xl font-serif text-med-ink">{value}</div>
      <div className="text-xs uppercase tracking-wider text-med-ink/50 mt-1">
        {spec.label}
      </div>
    </div>
  );
}

function CustomChartView({
  data,
  spec,
  chart,
}: {
  data: DashboardData;
  spec: CustomChartSpec;
  chart: ChartType;
}) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-med-ink/50 mb-3 shrink-0">
        {spec.label}
      </h2>
      <ChartBody
        series={computeCustomChart(data, spec)}
        isEur={customChartIsEur(spec)}
        chart={chart}
      />
    </div>
  );
}

function ListView({ data, refId }: { data: DashboardData; refId: string }) {
  const def = LIST_MAP[refId];
  if (!def) return null;
  const items = def.compute(data);
  const Icon = def.icon;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Icon className="w-5 h-5 text-med-terracotta" />
        <h2 className="font-serif text-lg text-med-ink">
          {def.label} ({items.length})
        </h2>
      </div>
      <ul className="flex-1 min-h-0 overflow-auto divide-y divide-med-olive/5">
        {items.map((it) => (
          <li key={it.id} className="py-2.5">
            <div
              className={`text-sm text-med-ink whitespace-pre-wrap ${it.italic ? 'italic' : ''}`}
            >
              {it.italic ? `“${it.primary}”` : it.primary}
            </div>
            <div className="text-xs text-med-ink/40 mt-1">— {it.secondary}</div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-6 text-center text-sm text-med-ink/40">Sin datos todavía.</li>
        )}
      </ul>
    </div>
  );
}

export function WidgetCard({
  widget,
  data,
  editing,
  onRemove,
  onChartChange,
  onSizeChange,
  dragHandle,
}: {
  widget: Widget;
  data: DashboardData;
  editing: boolean;
  onRemove: () => void;
  onChartChange: (chart: ChartType) => void;
  onSizeChange: (size: WidgetSize) => void;
  dragHandle?: ReactNode;
}) {
  const size =
    widget.size ??
    (widget.kind === 'stat' ? 'sm' : widget.kind === 'list' ? 'lg' : 'md');
  return (
    <div
      className={`relative bg-white rounded-xl border p-4 h-full flex flex-col ${editing ? 'border-med-olive/40 ring-1 ring-med-olive/20' : 'border-med-olive/10'
        }`}
    >
      {editing && (
        <div className="absolute -top-3 right-3 flex items-center gap-1 bg-white border border-med-olive/20 rounded-lg shadow-sm px-1 py-0.5 z-10">
          {dragHandle}
          <select
            value={size}
            onChange={(e) => onSizeChange(e.target.value as WidgetSize)}
            className="text-xs bg-transparent border-l border-med-olive/20 pl-1 focus:outline-none"
            title="Tamaño del bloque"
          >
            <option value="sm">S</option>
            <option value="md">M</option>
            <option value="lg">L</option>
          </select>
          {(widget.kind === 'chart' || widget.kind === 'custom-chart') && (
            <select
              value={widget.chart}
              onChange={(e) => onChartChange(e.target.value as ChartType)}
              className="text-xs bg-transparent border-l border-med-olive/20 pl-1 focus:outline-none"
              title="Tipo de gráfico"
            >
              <option value="bar">Barras</option>
              <option value="pie">Tarta</option>
              <option value="donut">Donut</option>
            </select>
          )}
          <button
            onClick={onRemove}
            className="p-1 text-med-ink/50 hover:text-med-terracotta border-l border-med-olive/20"
            title="Quitar bloque"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {widget.kind === 'stat' && <StatView data={data} refId={widget.ref} />}
      {widget.kind === 'chart' && (
        <ChartView data={data} refId={widget.ref} chart={widget.chart} />
      )}
      {widget.kind === 'list' && <ListView data={data} refId={widget.ref} />}
      {widget.kind === 'custom-stat' && (
        <CustomStatView data={data} spec={widget.spec} />
      )}
      {widget.kind === 'custom-chart' && (
        <CustomChartView data={data} spec={widget.spec} chart={widget.chart} />
      )}
    </div>
  );
}

export function AddBlockModal({
  onClose,
  onAdd,
  onCustom,
  used,
}: {
  onClose: () => void;
  onAdd: (widget: WidgetDraft) => void;
  onCustom: () => void;
  used: Set<string>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-med-ink/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-auto bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-med-ink">Añadir bloque</h2>
          <button
            onClick={onClose}
            className="text-med-ink/40 hover:text-med-ink transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onCustom}
          className="w-full flex items-center gap-2 mb-5 px-4 py-3 rounded-lg border border-dashed border-med-olive/40 text-sm text-med-ink/80 hover:bg-med-olive/5 transition"
        >
          <Wand2 className="w-4 h-4 text-med-olive shrink-0" />
          Crear bloque personalizado (tu propio KPI o gráfico)
        </button>

        <Section title="KPI (tarjeta de número)">
          {METRICS.map((m) => (
            <Option
              key={m.id}
              label={m.label}
              used={used.has(`stat:${m.id}`)}
              onClick={() => onAdd({ kind: 'stat', ref: m.id })}
            />
          ))}
        </Section>

        <Section title="Gráfico">
          {SERIES.map((s) => (
            <Option
              key={s.id}
              label={s.label}
              used={used.has(`chart:${s.id}`)}
              onClick={() =>
                onAdd({
                  kind: 'chart',
                  ref: s.id,
                  chart: s.id === 'status' || s.id === 'adults_children' ? 'pie' : 'bar',
                })
              }
            />
          ))}
        </Section>

        <Section title="Lista">
          {LISTS.map((l) => (
            <Option
              key={l.id}
              label={l.label}
              used={used.has(`list:${l.id}`)}
              onClick={() => onAdd({ kind: 'list', ref: l.id })}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

const Section: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-med-ink/50 mb-2">
        {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
    </div>
  );
};

const Option: FC<{ label: string; onClick: () => void; used?: boolean }> = ({
  label,
  onClick,
  used,
}) => {
  return (
    <button
      onClick={onClick}
      title={used ? 'Ya está en el panel (puedes añadirlo de nuevo)' : undefined}
      className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg border transition ${used
          ? 'border-med-olive/40 bg-med-olive/5 text-med-ink'
          : 'border-med-olive/15 text-med-ink/80 hover:bg-med-olive/5 hover:border-med-olive/30'
        }`}
    >
      {used ? (
        <Check className="w-3.5 h-3.5 text-med-olive shrink-0" />
      ) : (
        <Plus className="w-3.5 h-3.5 text-med-olive shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
};

function BuilderField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-med-ink/50 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectCls =
  'w-full px-2 py-1.5 rounded-lg border border-med-olive/20 text-sm focus:outline-none focus:ring-1 focus:ring-med-terracotta/30';

export function CustomBlockModal({
  data,
  onClose,
  onAdd,
}: {
  data: DashboardData;
  onClose: () => void;
  onAdd: (widget: WidgetDraft) => void;
}) {
  const [type, setType] = useState<'stat' | 'chart'>('stat');
  const [source, setSource] = useState('guests');
  const src = SOURCE_MAP[source];
  const hasNumeric = src.numeric.length > 0;

  const [agg, setAgg] = useState<'count' | 'sum' | 'avg'>('count');
  const [numField, setNumField] = useState(src.numeric[0]?.id ?? '');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [groupBy, setGroupBy] = useState(src.categorical[0]?.id ?? '');
  const [measure, setMeasure] = useState<'count' | 'sum'>('count');
  const [chart, setChart] = useState<ChartType>('bar');
  const [label, setLabel] = useState('');

  const changeSource = (s: string) => {
    const ns = SOURCE_MAP[s];
    setSource(s);
    setNumField(ns.numeric[0]?.id ?? '');
    setFilterField('');
    setFilterValue('');
    setGroupBy(ns.categorical[0]?.id ?? '');
    if (ns.numeric.length === 0) {
      setAgg('count');
      setMeasure('count');
    }
  };

  const changeFilterField = (f: string) => {
    setFilterField(f);
    const values = f ? distinctValues(data, source, f) : [];
    setFilterValue(values[0] ?? '');
  };

  const filterValues = filterField ? distinctValues(data, source, filterField) : [];
  const numLabel = src.numeric.find((n) => n.id === numField)?.label ?? '';
  const catLabel = (id: string) =>
    src.categorical.find((c) => c.id === id)?.label ?? '';

  const statSuggestion =
    agg === 'count'
      ? `Nº de ${src.label}${filterField ? ` · ${catLabel(filterField)}: ${filterValue}` : ''}`
      : `${agg === 'sum' ? 'Suma' : 'Media'} de ${numLabel}${filterField ? ` · ${catLabel(filterField)}: ${filterValue}` : ''}`;
  const chartSuggestion =
    measure === 'count'
      ? `${src.label} por ${catLabel(groupBy)}`
      : `${numLabel} por ${catLabel(groupBy)}`;

  const finalLabel =
    label.trim() || (type === 'stat' ? statSuggestion : chartSuggestion);

  const statSpec: CustomStatSpec = {
    source,
    agg,
    field: agg === 'count' ? undefined : numField,
    filterField: filterField || undefined,
    filterValue: filterField ? filterValue || undefined : undefined,
    label: finalLabel,
  };
  const chartSpec: CustomChartSpec = {
    source,
    groupBy,
    measure,
    field: measure === 'sum' ? numField : undefined,
    label: finalLabel,
  };

  const submit = () => {
    if (type === 'stat') onAdd({ kind: 'custom-stat', spec: statSpec });
    else onAdd({ kind: 'custom-chart', chart, spec: chartSpec });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-med-ink/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 font-serif text-xl text-med-ink">
            <Wand2 className="w-5 h-5 text-med-olive" />
            Bloque personalizado
          </h2>
          <button onClick={onClose} className="text-med-ink/40 hover:text-med-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type */}
        <div className="flex gap-2 mb-4">
          {(['stat', 'chart'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm border transition ${type === t
                  ? 'bg-med-olive text-white border-med-olive'
                  : 'border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5'
                }`}
            >
              {t === 'stat' ? 'KPI (número)' : 'Gráfico'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BuilderField label="Fuente de datos">
            <select
              value={source}
              onChange={(e) => changeSource(e.target.value)}
              className={selectCls}
            >
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </BuilderField>

          {type === 'stat' ? (
            <>
              <BuilderField label="Cálculo">
                <select
                  value={agg}
                  onChange={(e) => setAgg(e.target.value as typeof agg)}
                  className={selectCls}
                >
                  <option value="count">Nº de filas</option>
                  <option value="sum" disabled={!hasNumeric}>
                    Suma
                  </option>
                  <option value="avg" disabled={!hasNumeric}>
                    Media
                  </option>
                </select>
              </BuilderField>
              {agg !== 'count' && (
                <BuilderField label="Campo">
                  <select
                    value={numField}
                    onChange={(e) => setNumField(e.target.value)}
                    className={selectCls}
                  >
                    {src.numeric.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </BuilderField>
              )}
              <BuilderField label="Filtrar por (opcional)">
                <select
                  value={filterField}
                  onChange={(e) => changeFilterField(e.target.value)}
                  className={selectCls}
                >
                  <option value="">— Sin filtro —</option>
                  {src.categorical.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </BuilderField>
              {filterField && (
                <BuilderField label="Valor">
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className={selectCls}
                  >
                    {filterValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </BuilderField>
              )}
            </>
          ) : (
            <>
              <BuilderField label="Agrupar por">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className={selectCls}
                >
                  {src.categorical.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </BuilderField>
              <BuilderField label="Medida">
                <select
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value as typeof measure)}
                  className={selectCls}
                >
                  <option value="count">Nº de filas</option>
                  <option value="sum" disabled={!hasNumeric}>
                    Suma
                  </option>
                </select>
              </BuilderField>
              {measure === 'sum' && (
                <BuilderField label="Campo">
                  <select
                    value={numField}
                    onChange={(e) => setNumField(e.target.value)}
                    className={selectCls}
                  >
                    {src.numeric.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </BuilderField>
              )}
              <BuilderField label="Tipo de gráfico">
                <select
                  value={chart}
                  onChange={(e) => setChart(e.target.value as ChartType)}
                  className={selectCls}
                >
                  <option value="bar">Barras</option>
                  <option value="pie">Tarta</option>
                  <option value="donut">Donut</option>
                </select>
              </BuilderField>
            </>
          )}

          <BuilderField label="Etiqueta">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={type === 'stat' ? statSuggestion : chartSuggestion}
              className={selectCls}
            />
          </BuilderField>
        </div>

        {/* Live preview */}
        <div className="mt-5 rounded-lg border border-med-olive/15 p-4 bg-med-cream/40">
          <div className="text-[11px] uppercase tracking-wider text-med-ink/40 mb-2">
            Vista previa
          </div>
          {type === 'stat' ? (
            <div>
              <div className="text-2xl font-serif text-med-ink">
                {computeCustomStat(data, statSpec).value}
              </div>
              <div className="text-xs uppercase tracking-wider text-med-ink/50 mt-1">
                {finalLabel}
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col">
              <div className="text-xs uppercase tracking-wider text-med-ink/50 mb-2">
                {finalLabel}
              </div>
              <ChartBody
                series={computeCustomChart(data, chartSpec)}
                isEur={customChartIsEur(chartSpec)}
                chart={chart}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-med-ink/60 hover:bg-med-olive/5 transition"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-med-olive text-white text-sm hover:bg-med-olive/90 transition"
          >
            <Sparkles className="w-4 h-4" />
            Añadir al panel
          </button>
        </div>
      </div>
    </div>
  );
}
