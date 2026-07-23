import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Configured, missingR2Vars, R2_BUCKET, publicUrl } from '../lib/r2';

function isAdmin(req: VercelRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  return !!token && req.headers.authorization === `Bearer ${token}`;
}

const ALLOWED_UPLOAD = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
];

// Public: returns a presigned PUT URL so the guest's browser can upload a photo
// directly to R2 (bypassing the serverless 4.5MB body limit).
async function handleUpload(req: VercelRequest, res: VercelResponse) {
  if (!r2Configured()) {
    return res.status(503).json({
      error: `Almacenamiento de fotos no configurado (faltan variables: ${missingR2Vars().join(', ')})`,
    });
  }
  const { contentType, ext } = req.body || {};
  if (!contentType || !ALLOWED_UPLOAD.includes(contentType)) {
    return res.status(400).json({ error: 'Solo se permiten fotos (jpg, png, webp, heic, gif)' });
  }
  const safeExt = typeof ext === 'string' ? ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) : '';
  const key = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt ? `.${safeExt}` : ''}`;
  try {
    const url = await getSignedUrl(
      r2Client(),
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 600 },
    );
    return res.status(200).json({ url, key });
  } catch (error) {
    console.error('Presign Error:', error);
    return res.status(500).json({ error: 'No se pudo preparar la subida' });
  }
}

// Public: redirects to a short-lived signed URL that forces a download
// (Content-Disposition: attachment), avoiding cross-origin fetch/CORS.
async function handleDownload(req: VercelRequest, res: VercelResponse) {
  if (!r2Configured()) return res.status(503).json({ error: 'Almacenamiento no configurado' });
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

// Public: streams a photo's bytes through our own origin so client-side code
// (e.g. building a ZIP) can read it without cross-origin/CORS issues.
async function handleFile(req: VercelRequest, res: VercelResponse) {
  if (!r2Configured()) return res.status(503).json({ error: 'Almacenamiento no configurado' });
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Public: force-download a photo.
      if (req.query.action === 'download') return handleDownload(req, res);
      // Public: stream a photo's bytes same-origin.
      if (req.query.action === 'file') return handleFile(req, res);

      // Public: list photos (newest first) with a viewable URL.
      const result = await sql`
        SELECT id, r2_key, uploader, content_type, created_at
        FROM photos
        ORDER BY created_at DESC
        LIMIT 1000
      `;
      const client = r2Configured() ? r2Client() : null;
      const items = await Promise.all(
        result.rows.map(async (row) => {
          let url = publicUrl(row.r2_key);
          if (!url && client) {
            url = await getSignedUrl(
              client,
              new GetObjectCommand({ Bucket: R2_BUCKET, Key: row.r2_key }),
              { expiresIn: 3600 },
            );
          }
          return {
            id: row.id,
            uploader: row.uploader,
            created_at: row.created_at,
            url,
          };
        }),
      );
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      // Public: presigned PUT URL for a direct browser upload.
      if (req.query.action === 'upload') return handleUpload(req, res);

      // Admin: sweep all rows and delete the ones whose R2 object is gone.
      if (req.query.action === 'cleanup') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
        if (!r2Configured()) {
          return res.status(503).json({ error: 'Almacenamiento no configurado' });
        }
        const rows = await sql`SELECT id, r2_key FROM photos`;
        const client = r2Client();
        let removed = 0;
        await Promise.all(
          rows.rows.map(async (row) => {
            try {
              await client.send(
                new HeadObjectCommand({ Bucket: R2_BUCKET, Key: row.r2_key }),
              );
            } catch {
              await sql`DELETE FROM photos WHERE id = ${row.id}`;
              removed++;
            }
          }),
        );
        return res.status(200).json({ removed });
      }

      // Self-healing: delete a DB row whose R2 object no longer exists.
      // Safe because it only removes rows whose file is confirmed missing.
      if (req.query.action === 'prune') {
        const id = Number(req.body?.id);
        if (!id) return res.status(400).json({ error: 'Falta el id' });
        const row = await sql`SELECT r2_key FROM photos WHERE id = ${id}`;
        const key: string | undefined = row.rows[0]?.r2_key;
        if (!key) return res.status(200).json({ pruned: false });
        if (!r2Configured()) return res.status(200).json({ pruned: false });
        try {
          await r2Client().send(
            new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
          );
          // Object still exists → keep the row.
          return res.status(200).json({ pruned: false });
        } catch {
          // Object missing → remove the orphan row.
          await sql`DELETE FROM photos WHERE id = ${id}`;
          return res.status(200).json({ pruned: true });
        }
      }

      // Public: record a photo's metadata after a successful upload.
      const { key, uploader, contentType, size } = req.body || {};
      if (!key) return res.status(400).json({ error: 'Falta la referencia del archivo' });
      await sql`
        INSERT INTO photos (r2_key, uploader, content_type, size)
        VALUES (${key}, ${uploader || null}, ${contentType || null}, ${size || null})
      `;
      return res.status(200).json({ success: true });
    }

    // Admin only: delete a photo (from R2 and the DB).
    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      const row = await sql`SELECT r2_key FROM photos WHERE id = ${id}`;
      const key = row.rows[0]?.r2_key;
      if (key && r2Configured()) {
        await r2Client().send(
          new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        );
      }
      await sql`DELETE FROM photos WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Photos API Error:', error);
    return res.status(500).json({ error: 'Error en la galería de fotos' });
  }
}
