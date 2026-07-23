import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendTelegram } from '../lib/telegram.js';

function esc(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ATTENDING_LABELS: Record<string, string> = {
  yes_all: 'Sí, a todo',
  only_ceremony: 'Solo a la ceremonia',
  only_dinner: 'Solo al banquete',
  no: 'No asiste',
};

const BUS_LABELS: Record<string, string> = {
  one_way: 'Solo ida',
  round_trip_1: 'Ida y vuelta (turno 1)',
  round_trip_2: 'Ida y vuelta (turno 2)',
  return_1: 'Solo vuelta (turno 1)',
  return_2: 'Solo vuelta (turno 2)',
  none: 'No necesita bus',
};

function formatGuests(guests: unknown): string {
  if (!Array.isArray(guests) || guests.length === 0) return '';
  return guests
    .map((g) => {
      if (g && typeof g === 'object') {
        const obj = g as Record<string, unknown>;
        const gname = obj.name ? esc(obj.name) : 'Invitado';
        const type = obj.type === 'child' ? ' (niño)' : '';
        return `• ${gname}${type}`;
      }
      return `• ${esc(g)}`;
    })
    .join('\n');
}

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

    // Notify via Telegram (non-blocking, best-effort).
    const isYes = attending !== 'no' && attending !== false;
    const emoji = isYes ? '\u2705' : '\u274C';
    const attendingLabel = ATTENDING_LABELS[attending as string] ?? String(attending);
    const guestsBlock = formatGuests(additional_guests);
    const parts = [
      '\u{1F389} <b>Nueva Confirmaci\u00f3n de Asistencia</b> \u{1F389}\n',
      `${emoji} <b>Asiste:</b> ${esc(attendingLabel)}`,
      `\u{1F464} <b>Nombre:</b> ${esc(name)}`,
      `\u{1F4E7} <b>Email:</b> ${esc(email)}`,
    ];
    if (dietary) parts.push(`\u{1F37D}\uFE0F <b>Restricciones diet\u00e9ticas:</b> ${esc(dietary)}`);
    if (bus_trip) parts.push(`\u{1F68C} <b>Bus:</b> ${esc(BUS_LABELS[bus_trip as string] ?? bus_trip)}`);
    if (songs) parts.push(`\u{1F3B5} <b>Canciones sugeridas:</b> ${esc(songs)}`);
    if (guestsBlock) parts.push(`\u{1F465} <b>Invitados adicionales:</b>\n${guestsBlock}`);
    if (message) parts.push(`\u{1F48C} <b>Mensaje:</b> ${esc(message)}`);
    parts.push(`\u{1F550} <b>Fecha:</b> ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
    await sendTelegram(parts.join('\n'));

    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('RSVP Error:', error);
    return res.status(500).json({ 
      error: 'Error al guardar la respuesta. Por favor, inténtalo de nuevo.' 
    });
  }
}
