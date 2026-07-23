import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Security: ADMIN_TOKEN is required.
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Admin no configurado (falta ADMIN_TOKEN)' });
  }
  if (req.headers.authorization !== `Bearer ${token}`) {
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

    // Guests table (admin source of truth). Each person is one row.
    await sql`
      CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        rsvp_id INTEGER,
        source_key TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        party_group TEXT,
        is_extra BOOLEAN DEFAULT FALSE,
        guest_type TEXT DEFAULT 'adult',
        dietary TEXT,
        rsvp_status TEXT DEFAULT 'pending',
        bus_trip TEXT,
        has_paid BOOLEAN DEFAULT FALSE,
        amount_paid NUMERIC(10,2) DEFAULT 0,
        payment_notes TEXT,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_guests_rsvp_id ON guests(rsvp_id)`;
    await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS table_id INTEGER`;

    const guestCount = await sql`SELECT COUNT(*)::int AS count FROM guests`;
    if (guestCount.rows[0].count === 0) {
      await sql`
        INSERT INTO guests (
          name, email, party_group, is_extra, guest_type,
          dietary, rsvp_status, has_paid, amount_paid, payment_notes, source
        )
        VALUES (
          'Invitado de ejemplo', 'ejemplo@boda.com', 'Familia', FALSE, 'adult',
          'Sin gluten', 'pending', FALSE, 0, NULL, 'manual'
        )
      `;
    }

    // Budget items table (seeded with the real figures from Calculos.xlsx).
    await sql`
      CREATE TABLE IF NOT EXISTS budget_items (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        concept TEXT NOT NULL,
        unit_cost NUMERIC(10,2),
        quantity NUMERIC(10,2),
        estimated NUMERIC(10,2) DEFAULT 0,
        actual NUMERIC(10,2) DEFAULT 0,
        paid NUMERIC(10,2) DEFAULT 0,
        payer TEXT DEFAULT 'comun',
        notes TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    const budgetCount = await sql`SELECT COUNT(*)::int AS count FROM budget_items`;
    if (budgetCount.rows[0].count === 0) {
      const seed: Array<[string, string, number | null, number | null, number, number, number, number]> = [
        ['Banquete', 'Menú adultos', 126.5, 187, 23763.5, 23763.5, 1000, 1],
        ['Banquete', 'Menú niños', 42.9, 13, 557.7, 557.7, 0, 2],
        ['Banquete', 'Jamón', null, null, 627, 627, 0, 3],
        ['Banquete', 'Música / DJ', null, null, 1584, 1584, 0, 4],
        ['Banquete', 'Barra libre', 22, 187, 4114, 4114, 0, 5],
        ['Transporte', 'Autocar 60 plazas (ida)', null, null, 1650, 1650, 0, 6],
        ['Transporte', 'Vuelta 1', null, null, 132, 132, 0, 7],
        ['Transporte', 'Vuelta 2', null, null, 132, 132, 0, 8],
        ['Fotografía', 'Fotógrafo', null, null, 1840, 1840, 200, 9],
        ['Ceremonia', 'Iglesia', null, null, 450, 450, 300, 10],
        ['Ceremonia', 'Alianzas', null, null, 300, 300, 0, 11],
        ['Papelería', 'Invitaciones', null, null, 202, 202, 202, 12],
        ['Detalles', 'Regalitos invitados', null, null, 200, 0, 0, 13],
        ['Detalles', 'Flores', null, null, 300, 300, 0, 14],
        ['Detalles', 'Extras', null, null, 300, 0, 0, 15],
        ['Viaje', 'Luna de miel', null, null, 4440.83, 4440.83, 2000, 16],
      ];
      for (const [category, concept, unit, qty, est, act, paid, order] of seed) {
        await sql`
          INSERT INTO budget_items (
            category, concept, unit_cost, quantity, estimated, actual, paid, payer, sort_order
          )
          VALUES (
            ${category}, ${concept}, ${unit}, ${qty}, ${est}, ${act}, ${paid}, 'comun', ${order}
          )
        `;
      }
    }

    // Tasks table (kanban).
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assignee TEXT,
        due_date DATE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`UPDATE tasks SET status = 'todo' WHERE status = 'backlog'`;
    const tasksCount = await sql`SELECT COUNT(*)::int AS count FROM tasks`;
    if (tasksCount.rows[0].count === 0) {
      const seedTasks: Array<[string, string, string, string, string, number]> = [
        ['Reservar autobuses', 'Confirmar plazas con Autocares Alegre', 'todo', 'high', 'comun', 1],
        ['Elegir menú final', 'Cerrar menú de adultos y niños con el catering', 'in_progress', 'high', 'comun', 2],
        ['Enviar invitaciones', 'Preparar y enviar las invitaciones pendientes', 'todo', 'medium', 'cris', 3],
        ['Contratar fotógrafo', 'Firmar contrato y pagar señal', 'done', 'medium', 'joan', 4],
      ];
      for (const [title, description, status, priority, assignee, order] of seedTasks) {
        await sql`
          INSERT INTO tasks (title, description, status, priority, assignee, sort_order)
          VALUES (${title}, ${description}, ${status}, ${priority}, ${assignee}, ${order})
        `;
      }
    }

    // Seating tables (distribución de mesas).
    await sql`
      CREATE TABLE IF NOT EXISTS seating_tables (
        id SERIAL PRIMARY KEY,
        label TEXT,
        shape TEXT DEFAULT 'circle',
        x NUMERIC(10,2) DEFAULT 120,
        y NUMERIC(10,2) DEFAULT 120,
        width NUMERIC(10,2) DEFAULT 96,
        height NUMERIC(10,2) DEFAULT 96,
        seats INTEGER DEFAULT 8,
        is_head BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`ALTER TABLE seating_tables ADD COLUMN IF NOT EXISTS rotation NUMERIC(10,2) DEFAULT 0`;

    // Key-value settings (e.g. the customizable dashboard layout).
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Photos uploaded by guests (files live in R2; here we store metadata).
    await sql`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        r2_key TEXT NOT NULL,
        uploader TEXT,
        content_type TEXT,
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC)`;

    return res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully. Tables rsvps, guests, budget_items, tasks, seating_tables, settings and photos created.' 
    });
    
  } catch (error: any) {
    console.error('Init DB Error:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize database',
      details: error.message 
    });
  }
}
