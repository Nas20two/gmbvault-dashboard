import type { IncomingMessage, ServerResponse } from 'node:http';
import { getBearer, jsonResponse, verifyToken } from '../src/lib/auth';
import { listBusinesses } from '../src/lib/businesses';

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
  const businesses = await listBusinesses();
  jsonResponse(res, 200, { businesses });
}
