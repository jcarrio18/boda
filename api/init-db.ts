import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Security: Only allow if ADMIN_TOKEN is provided
  const authHeader = req.headers.authorization;
  const expectedAuth = process.env.ADMIN_TOKEN ? `Bearer ${process.env.ADMIN_TOKEN}` : null;
  
  if (expectedAuth && authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized - Admin token required' });
  }

  try {
    // Create rsvps table
    await sql`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        dietary TEXT,
        attending TEXT NOT NULL,
        bus_trip TEXT,
        songs TEXT,
        message TEXT,
        additional_guests_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index on email for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rsvps_email ON rsvps(email)
    `;

    // Create index on created_at for sorting
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON rsvps(created_at DESC)
    `;
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully. Table "rsvps" created with indexes.' 
    });
    
  } catch (error: any) {
    console.error('Init DB Error:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize database',
      details: error.message 
    });
  }
}
