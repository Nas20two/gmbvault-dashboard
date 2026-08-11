/**
 * Generate data/businesses.json — the outreach/pipeline lookup table.
 *
 * Sources:
 *  - ALL_DATA audit metrics  -> data/all-data.json (from gbp-audit pages/index.js)
 *  - Sent outreach emails     -> live Agentic Inbox MCP (list_emails + get_email),
 *                                matched to their license-plate slug (?b=<slug> in body)
 *
 * Run:
 *   INBOX_ACCESS_CLIENT_ID='...access' \
 *   INBOX_ACCESS_CLIENT_SECRET='...' \
 *   node scripts/seed-businesses.mjs
 *
 * No MCP access is needed if data/businesses.json is already committed — the
 * dashboard reads only the static JSON at build/run time (read-only, no write-back).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ALL_DATA = JSON.parse(readFileSync(join(ROOT, 'data/all-data.json'), 'utf8'));

const MCP_URL = process.env.INBOX_MCP_URL || 'https://inbox.nasyhub.com/mcp';
const CLIENT_ID = process.env.INBOX_ACCESS_CLIENT_ID;
const CLIENT_SECRET = process.env.INBOX_ACCESS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('INBOX_ACCESS_CLIENT_ID / INBOX_ACCESS_CLIENT_SECRET required');
}

const ACCESS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
  'CF-Access-Client-Id': CLIENT_ID,
  'CF-Access-Client-Secret': CLIENT_SECRET,
};

async function post(body, extra = {}) {
  const r = await fetch(MCP_URL, { method: 'POST', headers: { ...ACCESS, ...extra }, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text(), sessionId: r.headers.get('mcp-session-id') };
}

const parseData = (text) =>
  text.split('\n').filter((l) => l.startsWith('data:'))
    .map((l) => { try { return JSON.parse(l.slice(5)); } catch { return null; } })
    .filter(Boolean);

const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'gmbvault-seed', version: '1.0.0' } } });
if (init.status !== 200 || !init.sessionId) throw new Error(`MCP initialize failed (${init.status}): ${init.text.slice(0, 200)}`);
await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, { 'mcp-session-id': init.sessionId });

const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_emails', arguments: { mailboxId: 'nas@nasyhub.com', folder: 'sent', limit: 40 } } }, { 'mcp-session-id': init.sessionId });
const emails = JSON.parse(parseData(list.text).find((m) => m.result).result.content[0].text);

const slugRe = /gbp\.nasyhub\.com\?b=([a-z0-9-]+)/i;

// slug -> { emails:Set, sentDates:[] }
const bySlug = new Map();
for (const e of emails) {
  if (!/^Quick audit:/.test(e.subject)) continue;
  const full = await (async () => {
    const g = await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_email', arguments: { mailboxId: 'nas@nasyhub.com', emailId: e.id } } }, { 'mcp-session-id': init.sessionId });
    const gm = parseData(g.text).find((m) => m.result);
    if (!gm) return null;
    return JSON.parse(gm.result.content[0].text);
  })();
  const m = (full?.body_text || full?.body_html || '').match(slugRe);
  const slug = m ? m[1] : null;
  if (!slug) continue;
  if (!bySlug.has(slug)) bySlug.set(slug, { emails: new Set(), sentDates: [] });
  const rec = bySlug.get(slug);
  rec.emails.add(e.recipient);
  rec.sentDates.push(e.date);
}

// Earlier sent date = "Sent on" shown first
const earliest = (dates) => (dates.length ? new Date(Math.min(...dates.map((d) => new Date(d).getTime()))).toISOString() : null);

const businesses = [];

// 1) Every business in ALL_DATA
for (const [slug, audit] of Object.entries(ALL_DATA)) {
  const rec = bySlug.get(slug);
  const name = audit.name;
  const trade = audit.trade;
  const status = rec ? 'Sent' : 'Drafted';
  const emails = rec ? [...rec.emails] : [];
  const ob = {
    slug,
    name,
    trade,
    email: emails.length ? emails.join(', ') : null,
    status,
    sentDate: rec ? earliest(rec.sentDates) : null,
    followUpDate: null,
    emailsSent: rec ? rec.sentDates.length : 0,
  };
  businesses.push(ob);
}

// 2) Emailed businesses missing from ALL_DATA (e.g. just-electrical-sydney-pty-ltd)
for (const [slug, rec] of bySlug) {
  if (ALL_DATA[slug]) continue;
  const name = (() => {
    // Recover a display name from subject if available is too fiddly; use slug prettified.
    return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  })();
  businesses.push({
    slug, name, trade: null,
    email: [...rec.emails].join(', '),
    status: 'Sent',
    sentDate: earliest(rec.sentDates),
    followUpDate: null,
    emailsSent: rec.sentDates.length,
  });
}

// Deterministic order: sent first, then drafted, alphabetical within group
businesses.sort((a, b) => {
  const rank = (s) => (s === 'Sent' ? 0 : 1);
  if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
  return a.name.localeCompare(b.name);
});

writeFileSync(join(ROOT, 'data/businesses.json'), JSON.stringify(businesses, null, 2) + '\n');
console.log(`Wrote ${businesses.length} businesses to data/businesses.json`);
console.log(`  Sent: ${businesses.filter((b) => b.status === 'Sent').length}, Drafted: ${businesses.filter((b) => b.status === 'Drafted').length}`);
