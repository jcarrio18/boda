import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Configured, R2_BUCKET, publicUrl } from '../lib/r2';

function isAdmin(req: VercelRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  return !!token && req.headers.authorization === `Bearer ${token}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Public: list photos (newest first) with a viewable URL.
    if (req.method === 'GET') {
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

    // Public: record a photo's metadata after a successful upload.
    if (req.method === 'POST') {
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
