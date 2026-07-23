import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Admin no configurado (falta ADMIN_TOKEN)' });
  }

  const provided = (req.body && req.body.token) || '';
  if (provided !== token) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  return res.status(200).json({ success: true });
}
