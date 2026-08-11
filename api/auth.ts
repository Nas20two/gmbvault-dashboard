import type { IncomingMessage, ServerResponse } from 'node:http';
import { clientIp, jsonResponse, makeToken, parseJson, rateLimited, recordFailure, verifyPassword } from '../src/lib/auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    jsonResponse(res, 429, { error: 'Too many attempts. Please wait a minute and try again.' });
    return;
  }
  const body = await parseJson<{ password?: string }>(req);
  if (!body) {
    jsonResponse(res, 400, { error: 'Invalid JSON body' });
    return;
  }
  const hash = process.env.DASHBOARD_PASSWORD_HASH;
  const ok = await verifyPassword(body.password ?? '', hash);
  if (!ok) {
    recordFailure(ip);
    jsonResponse(res, 401, { error: 'That password didn’t work. Try again.' });
    return;
  }
  const token = await makeToken();
  if (!token) {
    // JWT_SECRET missing — fail closed rather than sign with a guessable secret.
    jsonResponse(res, 500, { error: 'Server not configured. Please try again later.' });
    return;
  }
  jsonResponse(res, 200, { token });
}
