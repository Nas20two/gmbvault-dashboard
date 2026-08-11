import type { IncomingMessage, ServerResponse } from 'node:http';
import { getBearer, jsonResponse, verifyToken } from '../lib/auth';
import { getOpens } from '../lib/store';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  const authed = await verifyToken(getBearer(req));
  if (!authed) {
    jsonResponse(res, 401, { error: 'Unauthorized' });
    return;
  }
  const opens = await getOpens();
  jsonResponse(res, 200, { opens });
}
