// Pipeline storage. Per SATORI §6: mutable writes need a remote store on Vercel.
// We prefer Vercel KV; fall back to an in-memory map seeded from all-data when
// KV env vars are absent (local dev / no paid KV). Writes without KV are
// non-persistent — documented in README. Seed data (all-data.json) is read-only.
import type { PipelineState, TrackRecord } from '../types';
import allData from '../../data/all-data.json';
import businessesData from '../../data/businesses.json';

// Seed data is server-only. Vercel bundles these JSON imports into the built
// function, so the bundled artifact carries the data.
const allDataRows = allData as unknown as Record<string, AuditRow>;

// Outreach/pipeline lookup table — real MCP-derived sent/drafted state (VEX #1/#5).
export interface BusinessSeed {
  slug: string;
  name: string;
  trade: string | null;
  email: string | null;
  status: 'Sent' | 'Drafted';
  sentDate: string | null;
  followUpDate: string | null;
  emailsSent: number;
}
const businessesRows = businessesData as unknown as BusinessSeed[];
const businessesBySlug = new Map(businessesRows.map((b) => [b.slug, b]));

// ---- all-data (read-only seed) -------------------------------------------
export interface AuditRow {
  name: string; trade: string; city: string; searchTerm: string;
  rank: number; rating: number; reviewCount: number; website: string; phone: string;
  address: string; trafficPerMonth: number; trafficLossPct: number; trafficLossCalls: number;
  serviceArea: string; passCount: number; failCount: number;
  findings: { icon: string; label: string; status: string; desc: string }[];
  competitors: { name: string; rating: number; reviews: number; photos: number; responds: boolean; rank: number }[];
}
// Source of the full business set: every row in the lookup table (which itself
// covers ALL_DATA plus emailed-only businesses). Ordered: sent first, then drafted.
export function listBusinessSlugs(): string[] {
  return businessesRows.map((b) => b.slug);
}

export function listSlugs(): string[] {
  return Object.keys(allDataRows);
}

export function getBusinessSeed(slug: string): BusinessSeed | undefined {
  return businessesBySlug.get(slug);
}
export function getAudit(slug: string): AuditRow | undefined {
  return allDataRows[slug];
}

// ---- KV adapter ------------------------------------------------------------
const useKV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

let kv: any = null;
async function kvClient() {
  if (!useKV) return null;
  if (!kv) {
    const mod = await import('@vercel/kv');
    kv = mod.createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return kv;
}

// In-memory fallback store (dev only).
const memState = new Map<string, PipelineState>();
const memOpens = new Map<string, TrackRecord[]>();

const key = (slug: string) => `pipeline:${slug}`;
const opensKey = () => 'opens:all';

export async function getPipeline(slug: string): Promise<PipelineState> {
  const c = await kvClient();
  if (c) {
    const v = await c.hgetall(key(slug));
    if (v) return v as unknown as PipelineState;
  } else if (memState.has(slug)) {
    return memState.get(slug)!;
  }
  return freshPipeline(slug);
}

export async function savePipeline(slug: string, state: PipelineState): Promise<void> {
  const c = await kvClient();
  if (c) {
    await c.hset(key(slug), state as any);
    return;
  }
  memState.set(slug, state);
}

export async function getAllPipeline(): Promise<Record<string, PipelineState>> {
  const c = await kvClient();
  const out: Record<string, PipelineState> = {};
  if (c) {
    for (const slug of listBusinessSlugs()) {
      const v = await getPipeline(slug);
      out[slug] = v;
    }
    return out;
  }
  for (const slug of listBusinessSlugs()) {
    out[slug] = await getPipeline(slug);
  }
  return out;
}

export function freshPipeline(slug: string): PipelineState {
  const seed = businessesBySlug.get(slug);
  const sent = seed?.status === 'Sent';
  return {
    slug,
    status: sent ? 'sent' : 'drafted',
    followUpCounter: 0,
    sentDate: sent && seed?.sentDate ? seed.sentDate : null,
    repliedDate: null,
    convertedDate: null,
    notes: '',
    version: 1,
  };
}

// ---- opens -----------------------------------------------------------------
export async function logOpen(rec: TrackRecord): Promise<void> {
  const c = await kvClient();
  const all = await getOpens();
  all.push(rec);
  if (c) {
    await c.set(opensKey(), all);
    return;
  }
  memOpens.set('all', all);
}

export async function getOpens(): Promise<TrackRecord[]> {
  const c = await kvClient();
  if (c) {
    const v = await c.get(opensKey());
    return Array.isArray(v) ? (v as TrackRecord[]) : [];
  }
  return memOpens.get('all') ?? [];
}

// ---- email store ------------------------------------------------------------
// Real per-business email state comes from the lookup table (businesses.json):
// emailsSent = deduped count of sent outreach emails for that slug (VEX #5).
export interface EmailSeed {
  id: string; subject: string; recipient: string; date: string; body: string;
}
const EMAILS: Record<string, EmailSeed[]> = {};

function seedEmails(slug: string): EmailSeed[] {
  const seed = businessesBySlug.get(slug);
  if (!seed || seed.emailsSent === 0) return [];
  // One representative outreach record per business (Phase 1.2 streams the real
  // thread via MCP get_thread; here the lookup table drives count + sent date).
  const count = Math.max(1, seed.emailsSent);
  return Array.from({ length: count }, (_, i) => ({
    id: `${slug}-${i + 1}`,
    subject: `Quick audit: ${seed.name} on Google Maps`,
    recipient: seed.email ?? '',
    date: seed.sentDate ?? new Date().toISOString(),
    body: `Hi there,\n\nI noticed ${seed.name} could improve its Google Maps profile. Here's a free audit:\n\nhttps://gbp.nasyhub.com?b=${slug}\n\nNo strings attached — let me know if you'd like the full rundown.`,
  }));
}

export async function getEmailsFor(slug: string): Promise<EmailSeed[]> {
  if (EMAILS[slug]) return EMAILS[slug];
  const seeded = seedEmails(slug);
  EMAILS[slug] = seeded;
  return seeded;
}
export async function getEmailCount(slug: string): Promise<number> {
  return (await getEmailsFor(slug)).length;
}
