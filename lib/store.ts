// Pipeline storage. Per SATORI §6: mutable writes need a remote store on Vercel.
// We prefer Vercel KV; fall back to an in-memory map seeded from all-data when
// KV env vars are absent (local dev / no paid KV). Writes without KV are
// non-persistent — documented in README. Seed data (all-data.json) is read-only.
import type { PipelineState, TrackRecord } from './types.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Seed data is server-only. Vercel bundles these JSON imports into the built
// function, so the bundled artifact carries the data.
const allData: Record<string, AuditRow> = JSON.parse(
  readFileSync(resolve(__dirname, '../data/all-data.json'), 'utf8')
);
const businessesData: BusinessSeed[] = JSON.parse(
  readFileSync(resolve(__dirname, '../data/businesses.json'), 'utf8')
);

export interface BusinessSeed {
  slug: string;
  name: string;
  trade: string;
  email: string;
  status: string;
  sentDate: string | null;
  followUpDate: string | null;
  emailsSent: number;
}

const businessesBySlug = new Map(businessesData.map((b: BusinessSeed) => [b.slug, b]));
const allDataRows = allData as unknown as Record<string, AuditRow>;

// ---- all-data (read-only seed) -------------------------------------------
export interface AuditRow {
  name: string; trade: string; city: string; searchTerm: string;
  rank: number; rating: number; reviewCount: number; website: string; phone: string;
  address: string; trafficPerMonth: number; trafficLossPct: number; trafficLossCalls: number;
  serviceArea: string; passCount: number; failCount: number;
  findings: { icon: string; label: string; status: string; desc: string }[];
  competitors: { name: string; rating: number; reviews: number; photos: number; responds: boolean; rank: number }[];
}

export function listBusinessSlugs(): string[] {
  return Array.from(businessesBySlug.keys());
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
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let kv: any = null;
async function kvClient() {
  if (!useKV) return null;
  if (!kv) {
    const { Redis } = await import('@upstash/redis');
    kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return kv;
}

// In-memory fallback for local dev / no KV.
const memory: Record<string, PipelineState> = {};
for (const slug of businessesBySlug.keys()) {
  memory[slug] = freshPipeline(slug);
}

const key = (slug: string) => `pipeline:${slug}`;
const opensKey = () => 'opens:all';

export async function getPipeline(slug: string): Promise<PipelineState> {
  const c = await kvClient();
  if (c) {
    const raw = await c.get(key(slug));
    if (raw != null) {
      try {
        return JSON.parse(raw as string) as PipelineState;
      } catch {
        // Unreadable/corrupt stored value — fall through to a fresh seed.
      }
    }
  } else if (memory[slug]) {
    return memory[slug];
  }
  return freshPipeline(slug);
}

export async function savePipeline(
  slug: string,
  state: PipelineState,
): Promise<void> {
  const c = await kvClient();
  if (c) {
    // Store the whole state as one JSON string via set/get. hset rejects nulls
    // (JSON-serializes them to the literal string "null"), corrupting
    // repliedDate:null/convertedDate:null on the round-trip. JSON.stringify
    // preserves real nulls.
    await c.set(key(slug), JSON.stringify(state));
    return;
  }
  memory[slug] = state;
}

export async function getAllPipeline(): Promise<Record<string, PipelineState>> {
  const c = await kvClient();
  const out: Record<string, PipelineState> = {};
  if (c) {
    for (const slug of businessesBySlug.keys()) {
      out[slug] = await getPipeline(slug);
    }
    return out;
  }
  return { ...memory };
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

// ---- Open tracking (KV-backed) ---------------------------------------------
const opensMemory: TrackRecord[] = [];

export async function logOpen(rec: TrackRecord): Promise<void> {
  const c = await kvClient();
  const all = await getOpens();
  // Dedupe by (slug, emailHash) so re-opens of the same recipient don't
  // inflate the count and "opened" flips exactly once.
  if (all.some((o) => o.slug === rec.slug && o.emailHash === rec.emailHash)) {
    return;
  }
  all.push(rec);
  if (c) {
    await c.set(opensKey(), all);
    return;
  }
  opensMemory.push(rec);
}

export async function getOpens(): Promise<TrackRecord[]> {
  const c = await kvClient();
  if (c) {
    const v = await c.get(opensKey());
    return Array.isArray(v) ? (v as TrackRecord[]) : [];
  }
  return [...opensMemory];
}

// ---- Email records (seeded from businesses.json) --------------------------
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
  const emails: EmailSeed[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(seed.sentDate ?? Date.now());
    d.setMinutes(d.getMinutes() - i * 30); // stagger
    emails.push({
      id: `${slug}-${i}`,
      subject: `Quick audit: ${seed.name} on Google Maps`,
      recipient: seed.email ?? '',
      date: d.toISOString(),
      body: `Hi there,\n\nI noticed ${seed.name} could improve its Google Maps profile. Here's a free audit:\n\nhttps://gbp.nasyhub.com?b=${slug}\n\nNo strings attached — let me know if you'd like the full rundown.`,
    });
  }
  return emails;
}

export async function getEmailsFor(slug: string): Promise<EmailSeed[]> {
  if (!EMAILS[slug]) {
    EMAILS[slug] = seedEmails(slug);
  }
  return EMAILS[slug];
}

export async function getEmailCount(slug: string): Promise<number> {
  return (await getEmailsFor(slug)).length;
}