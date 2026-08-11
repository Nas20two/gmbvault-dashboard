import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, sha256 } from '../src/lib/auth';
import { logOpen } from '../src/lib/store';

// Standard 1x1 transparent GIF (SATORI §5 verified).
const GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  const url = new URL(req.url || '/', 'http://local');
  const slug = url.searchParams.get('b') || 'unknown';
  const emailHash = url.searchParams.get('e') || '';
  await logOpen({
    slug,
    emailHash: emailHash ? sha256(emailHash) : '',
    timestamp: new Date().toISOString(),
  });
  const buf = Buffer.from(GIF_B64, 'base64');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Content-Length', buf.length);
  res.end(buf);
}
