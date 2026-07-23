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

      let synced = 0;
      for (const row of rsvps.rows) {
        await sql`
          INSERT INTO guests (
            rsvp_id, source_key, name, email, is_extra, guest_type,
            dietary, rsvp_status, bus_trip, source
          )
          VALUES (
            ${row.id}, ${`rsvp:${row.id}:main`}, ${row.name}, ${row.email}, FALSE, 'adult',
            ${row.dietary || null}, ${row.attending}, ${row.bus_trip || null}, 'rsvp'
          )
          ON CONFLICT (source_key) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            dietary = EXCLUDED.dietary,
            rsvp_status = EXCLUDED.rsvp_status,
            bus_trip = EXCLUDED.bus_trip,
            rsvp_id = EXCLUDED.rsvp_id,
            updated_at = NOW()
        `;
        synced++;

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
          await sql`
            INSERT INTO guests (
              rsvp_id, source_key, name, email, is_extra, guest_type,
              dietary, rsvp_status, bus_trip, source
            )
            VALUES (
              ${row.id}, ${`rsvp:${row.id}:extra:${i}`}, ${extra.name || `Acompañante ${i + 1}`}, NULL, TRUE, ${guestType},
              ${extra.dietary || null}, ${row.attending}, ${row.bus_trip || null}, 'rsvp'
            )
            ON CONFLICT (source_key) DO UPDATE SET
              name = EXCLUDED.name,
              guest_type = EXCLUDED.guest_type,
              dietary = EXCLUDED.dietary,
              rsvp_status = EXCLUDED.rsvp_status,
              bus_trip = EXCLUDED.bus_trip,
              rsvp_id = EXCLUDED.rsvp_id,
              updated_at = NOW()
          `;
          synced++;
        }
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
