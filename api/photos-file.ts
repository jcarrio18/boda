import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Readable } from 'node:stream';
import { sql } from '@vercel/postgres';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, r2Configured, R2_BUCKET } from '../lib/r2';

// Public: streams a photo's bytes through our own origin so client-side code
// (e.g. building a ZIP) can read it without cross-origin/CORS issues.
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
    const row = await sql`SELECT r2_key, content_type FROM photos WHERE id = ${id}`;
    const key: string | undefined = row.rows[0]?.r2_key;
    if (!key) return res.status(404).json({ error: 'Foto no encontrada' });

    const obj = await r2Client().send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
    res.setHeader(
      'Content-Type',
      obj.ContentType || row.rows[0].content_type || 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const body = obj.Body as Readable;
    await new Promise<void>((resolve, reject) => {
      body.on('error', reject);
      res.on('finish', resolve);
      res.on('error', reject);
      body.pipe(res);
    });
  } catch (error) {
    console.error('Photo File Error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al leer la foto' });
  }
}
