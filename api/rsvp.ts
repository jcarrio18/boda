import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    name, 
    email, 
    dietary, 
    attending, 
    bus_trip, 
    songs, 
    message, 
    additional_guests 
  } = req.body;

  // Validate required fields
  if (!name || !email || !attending) {
    return res.status(400).json({ 
      error: 'Nombre, email y asistencia son campos obligatorios' 
    });
  }

  try {
    // Check if email already exists
    const existing = await sql`
      SELECT id FROM rsvps WHERE email = ${email}
    `;
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Este email ya ha sido utilizado para confirmar asistencia.' 
      });
    }

    // Insert new RSVP
    await sql`
      INSERT INTO rsvps (
        name, 
        email, 
        dietary, 
        attending, 
        bus_trip, 
        songs, 
        message, 
        additional_guests_json,
        created_at
      )
      VALUES (
        ${name}, 
        ${email},
        ${dietary || null}, 
        ${attending}, 
        ${bus_trip || null}, 
        ${songs || null}, 
        ${message || null}, 
        ${additional_guests ? JSON.stringify(additional_guests) : null},
        NOW()
      )
    `;
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('RSVP Error:', error);
    return res.status(500).json({ 
      error: 'Error al guardar la respuesta. Por favor, inténtalo de nuevo.' 
    });
  }
}
