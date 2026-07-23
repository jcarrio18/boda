import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      const key = String(req.query.key || '');
      if (!key) return res.status(400).json({ error: 'Falta la clave' });
      const result = await sql`SELECT value FROM settings WHERE key = ${key}`;
      const raw = result.rows[0]?.value ?? null;
      let value: unknown = null;
      if (raw != null) {
        try {
          value = JSON.parse(raw);
        } catch {
          value = null;
        }
      }
      return res.status(200).json({ key, value });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: 'Falta la clave' });
      const serialized = JSON.stringify(value ?? null);
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${serialized}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: 'Error en la configuración' });
  }
}
