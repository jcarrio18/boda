import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Configured, R2_BUCKET } from '../lib/r2';

// Public: redirects to a short-lived signed URL that forces a file download
// (Content-Disposition: attachment), so the browser saves the photo instead of
// opening it — and without relying on cross-origin fetch/CORS.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!r2Configured()) {
    return res.status(503).json({ error: 'Almacenamiento no configurado' });
  }
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'Falta el id' });

  try {
    const row = await sql`SELECT r2_key FROM photos WHERE id = ${id}`;
    const key: string | undefined = row.rows[0]?.r2_key;
    if (!key) return res.status(404).json({ error: 'Foto no encontrada' });

    const ext = (key.split('.').pop() || 'jpg').slice(0, 5);
    const url = await getSignedUrl(
      r2Client(),
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ResponseContentDisposition: `attachment; filename="boda-${id}.${ext}"`,
      }),
      { expiresIn: 300 },
    );

    res.setHeader('Location', url);
    return res.status(302).end();
  } catch (error) {
    console.error('Download Error:', error);
    return res.status(500).json({ error: 'No se pudo generar la descarga' });
  }
}
