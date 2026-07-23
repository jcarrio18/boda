import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Configured, missingR2Vars, R2_BUCKET } from '../lib/r2';

// Public endpoint: returns a presigned PUT URL so the guest's browser can
// upload a photo directly to R2 (bypassing the serverless 4.5MB limit).
const ALLOWED = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!r2Configured()) {
    return res.status(503).json({
      error: `Almacenamiento de fotos no configurado (faltan variables: ${missingR2Vars().join(', ')})`,
    });
  }

  const { contentType, ext } = req.body || {};
  if (!contentType || !ALLOWED.includes(contentType)) {
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
