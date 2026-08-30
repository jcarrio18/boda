import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fields that the admin is allowed to edit via PATCH.
const EDITABLE_FIELDS = [
  'name',
  'email',
  'party_group',
  'guest_type',
  'dietary',
  'rsvp_status',
  'bus_trip',
  'has_paid',
  'amount_paid',
  'payment_notes',
  'table_id',
] as const;

function isAuthorized(req: VercelRequest): boolean | 'unconfigured' {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return 'unconfigured';
  return req.headers.authorization === `Bearer ${token}`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const auth = isAuthorized(req);
  if (auth === 'unconfigured') {
    return res.status(503).json({ error: 'Admin no configurado (falta ADMIN_TOKEN)' });
  }
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT
          id, rsvp_id, name, email, party_group, is_extra, guest_type,
          dietary, rsvp_status, bus_trip, has_paid, amount_paid,
          payment_notes, table_id, source, created_at, updated_at
        FROM guests
        ORDER BY party_group NULLS LAST, is_extra ASC, name ASC
      `;
      return res.status(200).json(result.rows);
    }

    // Sync guests from RSVP submissions (idempotent via source_key).
    if (req.method === 'POST' && req.query.action === 'sync') {
      const rsvps = await sql`
        SELECT id, name, email, dietary, attending, bus_trip, additional_guests_json
        FROM rsvps
      `;

      // Build all rows (mains + extras) first, then do a single bulk INSERT so
      // we don't fire ~100 sequential round-trips (which timed out the function).
      const cols = [
        'rsvp_id', 'source_key', 'name', 'email', 'is_extra', 'guest_type',
        'dietary', 'rsvp_status', 'bus_trip', 'source',
      ];
      const rows: unknown[][] = [];

      for (const row of rsvps.rows) {
        rows.push([
          row.id, `rsvp:${row.id}:main`, row.name, row.email, false, 'adult',
          row.dietary || null, row.attending, row.bus_trip || null, 'rsvp',
        ]);

        let extras: Array<{ name?: string; dietary?: string; type?: string }> = [];
        if (row.additional_guests_json) {
          try {
            const parsed = JSON.parse(row.additional_guests_json);
            if (Array.isArray(parsed)) extras = parsed;
          } catch {
            extras = [];
          }
        }

        for (let i = 0; i < extras.length; i++) {
          const extra = extras[i] || {};
          const guestType = extra.type === 'child' ? 'child' : 'adult';
          rows.push([
            row.id, `rsvp:${row.id}:extra:${i}`, extra.name || `Acompañante ${i + 1}`, null, true, guestType,
            extra.dietary || null, row.attending, row.bus_trip || null, 'rsvp',
          ]);
        }
      }

      let synced = 0;
      if (rows.length > 0) {
        const valuesSql = rows
          .map((_, ri) => `(${cols.map((__, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`)
          .join(', ');
        const params = rows.flat();
        const text = `
          INSERT INTO guests (${cols.join(', ')})
          VALUES ${valuesSql}
          ON CONFLICT (source_key) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            guest_type = EXCLUDED.guest_type,
            dietary = EXCLUDED.dietary,
            rsvp_status = EXCLUDED.rsvp_status,
            bus_trip = EXCLUDED.bus_trip,
            rsvp_id = EXCLUDED.rsvp_id,
            updated_at = NOW()
        `;
        await sql.query(text, params as any[]);
        synced = rows.length;
      }

      return res.status(200).json({ success: true, synced });
    }

    if (req.method === 'PATCH') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id del invitado' });
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const field of EDITABLE_FIELDS) {
        if (field in (req.body || {})) {
          setClauses.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      values.push(id);
      const text = `UPDATE guests SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
      const result = await sql.query(text, values as any[]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitado no encontrado' });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.name) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
      }
      const result = await sql`
        INSERT INTO guests (
          name, email, party_group, is_extra, guest_type,
          dietary, rsvp_status, has_paid, amount_paid, payment_notes, source
        )
        VALUES (
          ${b.name}, ${b.email || null}, ${b.party_group || null}, ${b.is_extra || false}, ${b.guest_type || 'adult'},
          ${b.dietary || null}, ${b.rsvp_status || 'pending'}, ${b.has_paid || false}, ${b.amount_paid || 0}, ${b.payment_notes || null}, 'manual'
        )
        RETURNING *
      `;
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id del invitado' });
      }
      await sql`DELETE FROM guests WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Guests API Error:', error);
    return res.status(500).json({ error: 'Error en la gestión de invitados' });
  }
}
