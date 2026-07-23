import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const EDITABLE_FIELDS = [
  'label',
  'shape',
  'x',
  'y',
  'width',
  'height',
  'seats',
  'is_head',
  'rotation',
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
        SELECT id, label, shape, x, y, width, height, seats, is_head, rotation, created_at, updated_at
        FROM seating_tables
        ORDER BY id ASC
      `;
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const shape = b.shape || 'circle';
      const isHead = b.is_head || false;
      const width = b.width ?? (shape === 'oval' ? 150 : 96);
      const height = b.height ?? 96;
      const seats = b.seats ?? (isHead ? 2 : 8);
      const result = await sql`
        INSERT INTO seating_tables (label, shape, x, y, width, height, seats, is_head)
        VALUES (
          ${b.label ?? null}, ${shape}, ${b.x ?? 120}, ${b.y ?? 120},
          ${width}, ${height}, ${seats}, ${isHead}
        )
        RETURNING *
      `;
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id de la mesa' });
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
      const text = `UPDATE seating_tables SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
      const result = await sql.query(text, values as any[]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Mesa no encontrada' });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id de la mesa' });
      }
      await sql`UPDATE guests SET table_id = NULL WHERE table_id = ${id}`;
      await sql`DELETE FROM seating_tables WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tables API Error:', error);
    return res.status(500).json({ error: 'Error en la gestión de mesas' });
  }
}
