export type RsvpStatus =
  | 'pending'
  | 'yes_all'
  | 'only_ceremony'
  | 'only_dinner'
  | 'no';

export type GuestType = 'adult' | 'child';

export type BusTrip =
  | 'one_way'
  | 'round_trip_1'
  | 'round_trip_2'
  | 'return_1'
  | 'return_2'
  | 'none';

export const BUS_TRIP_LABELS: Record<BusTrip, string> = {
  one_way: 'Solo ida',
  round_trip_1: 'Ida y vuelta (1er turno)',
  round_trip_2: 'Ida y vuelta (2º turno)',
  return_1: 'Solo vuelta (1er turno)',
  return_2: 'Solo vuelta (2º turno)',
  none: 'No usa autobús',
};

export const BUS_TRIP_ORDER: BusTrip[] = [
  'one_way',
  'round_trip_1',
  'round_trip_2',
  'return_1',
  'return_2',
  'none',
];

export interface Rsvp {
  id: number;
  name: string;
  email: string;
  dietary: string | null;
  attending: string;
  bus_trip: BusTrip | null;
  songs: string | null;
  message: string | null;
  additional_guests_json: string | null;
  created_at: string;
}

export interface Guest {
  id: number;
  rsvp_id: number | null;
  name: string;
  email: string | null;
  party_group: string | null;
  is_extra: boolean;
  guest_type: GuestType;
  dietary: string | null;
  rsvp_status: RsvpStatus;
  bus_trip: BusTrip | null;
  has_paid: boolean;
  amount_paid: number | string | null;
  payment_notes: string | null;
  table_id: number | null;
  source: 'rsvp' | 'manual';
  created_at: string;
  updated_at: string;
}

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  pending: 'Pendiente',
  yes_all: 'Asiste (todo)',
  only_ceremony: 'Solo ceremonia',
  only_dinner: 'Solo cena',
  no: 'No asiste',
};

export const CONFIRMED_STATUSES: RsvpStatus[] = [
  'yes_all',
  'only_ceremony',
  'only_dinner',
];

export function isConfirmed(status: RsvpStatus): boolean {
  return CONFIRMED_STATUSES.includes(status);
}

export function toAmount(value: number | string | null): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export type Payer = 'cris' | 'joan' | 'comun';

export interface BudgetItem {
  id: number;
  category: string;
  concept: string;
  unit_cost: number | string | null;
  quantity: number | string | null;
  estimated: number | string | null;
  actual: number | string | null;
  paid: number | string | null;
  payer: Payer | string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const PAYER_LABELS: Record<Payer, string> = {
  cris: 'Cris',
  joan: 'Joan',
  comun: 'Común',
};

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  done: 'Hecho',
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export type TableShape = 'oval' | 'circle' | 'square';

export interface SeatingTable {
  id: number;
  label: string | null;
  shape: TableShape;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  seats: number;
  is_head: boolean;
  rotation: number | string;
  created_at: string;
  updated_at: string;
}
