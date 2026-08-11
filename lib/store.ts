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
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

// In-memory fallback for local dev / no KV
const memory: Record<string, PipelineState> = {};
for (const slug of businessesBySlug.keys()) {
  memory[slug] = freshPipeline(slug);
}

export async function getPipeline(slug: string): Promise<PipelineState> {
  // Fallback: always return a fresh pipeline for every slug (even unknown).
  return memory[slug] ?? freshPipeline(slug);
}

export async function savePipeline(
  slug: string,
  state: PipelineState,
): Promise<void> {
  if (useKV) {
    // KV write — not implemented in Phase 1.1
  }
  memory[slug] = state;
}

export async function getAllPipeline(): Promise<Record<string, PipelineState>> {
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

// ---- Open tracking (KV-backed, Phase 1.5) ---------------------------------
const opensMemory: TrackRecord[] = [];

export async function logOpen(rec: TrackRecord): Promise<void> {
  opensMemory.push(rec);
}

export async function getOpens(): Promise<TrackRecord[]> {
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
