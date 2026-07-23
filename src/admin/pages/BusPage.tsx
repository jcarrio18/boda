import { useMemo } from 'react';
import type { ReactNode, FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Bus, Users } from 'lucide-react';
import { useApi } from '../useApi';
import {
  type Guest,
  type BusTrip,
  BUS_TRIP_LABELS,
  BUS_TRIP_ORDER,
} from '../types';

// Capacidad de referencia del autocar (hoja Autobuses de Calculos.xlsx).
const BUS_CAPACITY = 60;
const COLORS: Record<BusTrip, string> = {
  one_way: '#7BA4B1',
  round_trip_1: '#5A5A40',
  round_trip_2: '#B08D57',
  return_1: '#9CA37E',
  return_2: '#A8763E',
  none: '#C0C0B0',
};

export default function BusPage() {
  const { data: guests, loading, error } = useApi<Guest[]>('/api/guests');

  const { counts, groups, usingBus } = useMemo(() => {
    const list = guests ?? [];
    const counts: Record<BusTrip, number> = {
      one_way: 0,
      round_trip_1: 0,
      round_trip_2: 0,
      return_1: 0,
      return_2: 0,
      none: 0,
    };
    const groups: Record<BusTrip, Guest[]> = {
      one_way: [],
      round_trip_1: [],
      round_trip_2: [],
      return_1: [],
      return_2: [],
      none: [],
    };
    for (const g of list) {
      const trip = (g.bus_trip ?? 'none') as BusTrip;
      if (counts[trip] == null) continue;
      counts[trip]++;
      groups[trip].push(g);
    }
    const usingBus =
      counts.one_way +
      counts.round_trip_1 +
      counts.round_trip_2 +
      counts.return_1 +
      counts.return_2;
    return { counts, groups, usingBus };
  }, [guests]);

  if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
  if (loading) return <div className="p-8 text-med-ink/40">Cargando autobús…</div>;

  const chartData = BUS_TRIP_ORDER.filter((t) => t !== 'none').map((t) => ({
    name: BUS_TRIP_LABELS[t],
    value: counts[t],
    trip: t,
  }));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-med-ink">Autobús</h1>
        <p className="text-sm text-med-ink/50 mt-1">
          Personas por trayecto según lo indicado en el formulario
        </p>
      </header>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card
          icon={<Users className="w-4 h-4" />}
          label="Usan autobús"
          value={String(usingBus)}
          accent="olive"
        />
        {BUS_TRIP_ORDER.filter((t) => t !== 'none').map((t) => (
          <Card
            key={t}
            icon={<Bus className="w-4 h-4" />}
            label={BUS_TRIP_LABELS[t]}
            value={String(counts[t])}
            hint={`${Math.ceil(counts[t] / BUS_CAPACITY)} autocar(es) de ${BUS_CAPACITY}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-xl border border-med-olive/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-med-ink/50 mb-4">
            Personas por trayecto
          </h2>
          {usingBus === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-med-ink/30 text-sm">
              Nadie ha seleccionado autobús todavía
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.trip} fill={COLORS[d.trip]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lists per trip */}
        <div className="space-y-4">
          {BUS_TRIP_ORDER.map((trip) => (
            <div
              key={trip}
              className="bg-white rounded-xl border border-med-olive/10 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-med-olive/10">
                <span className="text-sm font-semibold text-med-ink">
                  {BUS_TRIP_LABELS[trip]}
                </span>
                <span className="text-xs text-med-ink/40">
                  {counts[trip]} personas
                </span>
              </div>
              <ul className="divide-y divide-med-olive/5 max-h-40 overflow-auto">
                {groups[trip].map((g) => (
                  <li
                    key={g.id}
                    className="px-4 py-1.5 text-sm text-med-ink/80 flex items-center justify-between"
                  >
                    <span className="truncate">{g.name}</span>
                    {g.party_group && (
                      <span className="text-xs text-med-ink/40 shrink-0 ml-2">
                        {g.party_group}
                      </span>
                    )}
                  </li>
                ))}
                {groups[trip].length === 0 && (
                  <li className="px-4 py-3 text-center text-xs text-med-ink/30">
                    —
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const Card: FC<{
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'ink' | 'olive';
}> = ({ icon, label, value, hint, accent = 'ink' }) => {
  return (
    <div className="bg-white rounded-xl border border-med-olive/10 p-4">
      <div
        className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${accent === 'olive' ? 'text-med-olive' : 'text-med-ink/50'
          }`}
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-serif text-med-ink mt-1">{value}</div>
      {hint && <div className="text-[11px] text-med-ink/40 mt-0.5">{hint}</div>}
    </div>
  );
}
