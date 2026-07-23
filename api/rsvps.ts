import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: ADMIN_TOKEN is required for this admin-only endpoint.
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Admin no configurado (falta ADMIN_TOKEN)' });
  }
  if (req.headers.authorization !== `Bearer ${token}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sql`
      SELECT 
        id,
        name,
        email,
        dietary,
        attending,
        bus_trip,
        songs,
        message,
        additional_guests_json,
        created_at
      FROM rsvps 
      ORDER BY created_at DESC
    `;
    
    return res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ 
      error: 'Error al obtener las respuestas' 
    });
  }
}
