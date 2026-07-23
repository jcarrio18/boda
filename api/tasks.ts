import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const EDITABLE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'assignee',
  'due_date',
  'sort_order',
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
          id, title, description, status, priority, assignee,
          due_date, sort_order, created_at, updated_at
        FROM tasks
        ORDER BY sort_order ASC, id ASC
      `;
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.title) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }
      const result = await sql`
        INSERT INTO tasks (title, description, status, priority, assignee, due_date, sort_order)
        VALUES (
          ${b.title}, ${b.description || null}, ${b.status || 'todo'},
          ${b.priority || 'medium'}, ${b.assignee || null}, ${b.due_date || null},
          ${b.sort_order ?? 999}
        )
        RETURNING *
      `;
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id de la tarea' });
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const field of EDITABLE_FIELDS) {
        if (field in (req.body || {})) {
          const value = req.body[field];
          setClauses.push(`${field} = $${idx++}`);
          values.push(value === '' ? null : value);
        }
      }
      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      values.push(id);
      const text = `UPDATE tasks SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
      const result = await sql.query(text, values as any[]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ error: 'Falta el id de la tarea' });
      }
      await sql`DELETE FROM tasks WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API Error:', error);
    return res.status(500).json({ error: 'Error en la gestión de tareas' });
  }
}
