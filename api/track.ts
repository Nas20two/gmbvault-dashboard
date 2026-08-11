import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, sha256 } from '../lib/auth.js';
import { getBusinessSeed, logOpen } from '../lib/store.js';

// Standard 1x1 transparent GIF (SATORI §5 verified).
const GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  const url = new URL(req.url || '/', 'http://local');
  const slug = url.searchParams.get('b') || '';
  const emailHash = url.searchParams.get('e') || '';

  // Only log real opens: a known business slug carrying an email identity.
  // Unvalidated/empty pixels are still served a GIF (so email rendering never
  // breaks) but are not counted.
  if (slug && emailHash && getBusinessSeed(slug)) {
    await logOpen({
      slug,
      emailHash: sha256(emailHash),
      timestamp: new Date().toISOString(),
    });
  }

  const buf = Buffer.from(GIF_B64, 'base64');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Content-Length', buf.length);
  res.end(buf);
}
