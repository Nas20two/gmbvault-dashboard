import type { IncomingMessage, ServerResponse } from 'node:http';
import { getBearer, jsonResponse, parseJson, verifyToken } from '../../src/lib/auth.js';
import { toDetail } from '../../src/lib/businesses.js';
import * as store from '../../src/lib/store.js';

export default async function handler(req: IncomingMessage, res: ServerResponse, slug?: string) {
  const authed = await verifyToken(getBearer(req));
  if (!authed) {
    jsonResponse(res, 401, { error: 'Unauthorized' });
    return;
  }
  if (!slug) {
    jsonResponse(res, 400, { error: 'Missing slug' });
    return;
  }
  if (!store.getBusinessSeed(slug)) {
    // Unknown slug -> a real 404 (getPipeline would otherwise fabricate a
    // near-empty pipeline and return 200).
    jsonResponse(res, 404, { error: 'Not found' });
    return;
  }
  if (req.method === 'GET') {
    const detail = await toDetail(slug);
    if (!detail) {
      jsonResponse(res, 404, { error: 'Not found' });
      return;
    }
    jsonResponse(res, 200, { business: detail });
    return;
  }
  if (req.method === 'PATCH') {
    const body = await parseJson<{ action?: string; notes?: string }>(req);
    if (!body) {
      jsonResponse(res, 400, { error: 'Invalid JSON body' });
      return;
    }
    const pipe = await store.getPipeline(slug);
    const now = new Date().toISOString();

    // THORN §10 state machine + "reply always wins" + guard against stale
    // follow-up taps overwriting a live reply. followup_1/followup_2 are
    // derived from followUpCounter + elapsed time (see deriveStatus), so the
    // stored status stays 'sent' across follow-up taps.
    let apply = true;
    switch (body.action) {
      case 'followup_sent':
        if (pipe.status === 'replied' || pipe.status === 'converted') apply = false;
        else {
          pipe.followUpCounter = Math.min(2, pipe.followUpCounter + 1);
          pipe.status = 'sent';
          pipe.sentDate = now;
        }
        break;
      case 'replied':
        pipe.status = 'replied';
        pipe.repliedDate = now;
        break;
      case 'convert':
        pipe.status = 'converted';
        pipe.convertedDate = now;
        break;
      case 'notes':
        if (typeof body.notes === 'string') pipe.notes = body.notes;
        break;
      default:
        jsonResponse(res, 400, { error: 'Unknown action' });
        return;
    }
    if (!apply) {
      // A reply already exists — do not let a stale tap win (THORN §2).
      // No state changed, so don't bump version or re-persist.
      jsonResponse(res, 200, { business: await toDetail(slug) });
      return;
    }
    pipe.version++;
    await store.savePipeline(slug, pipe);
    jsonResponse(res, 200, { business: await toDetail(slug) });
    return;
  }
  jsonResponse(res, 405, { error: 'Method not allowed' });
}
