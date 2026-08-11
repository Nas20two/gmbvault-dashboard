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
  const { password } = await parseJson<{ password?: string }>(req);
  const hash = process.env.DASHBOARD_PASSWORD_HASH;
  const ok = await verifyPassword(password ?? '', hash);
  if (!ok) {
    recordFailure(ip);
    jsonResponse(res, 401, { error: 'That password didn’t work. Try again.' });
    return;
  }
  const token = await makeToken();
  jsonResponse(res, 200, { token });
}
