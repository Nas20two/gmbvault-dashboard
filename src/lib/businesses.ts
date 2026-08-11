// Joins ALL_DATA + pipeline + opens into the dashboard's Business view.
import type { Business, BusinessDetail, OpenState, PipelineState, TrackRecord } from '../types';
import { deriveStatus, needsFollowUp } from './status';
import * as store from './store';
import type { AuditRow, EmailSeed } from './store';

export function computeScore(audit: AuditRow): number {
  const total = audit.passCount + audit.failCount;
  return total === 0 ? 0 : Math.round((audit.passCount / total) * 100);
}

export function openStateFor(slug: string, emails: EmailSeed[], opens: TrackRecord[]): OpenState {
  if (emails.length === 0) return 'untracked';
  for (const o of opens) {
    if (o.slug === slug) return 'opened';
  }
  // If any email is older than 48h and never opened -> unopened; else pending -> untracked.
  const cutoff = Date.now() - 48 * 3600 * 1000;
  return emails.some((e) => new Date(e.date).getTime() < cutoff) ? 'unopened' : 'untracked';
}

export async function toBusiness(
  slug: string,
  pipe: PipelineState,
  opens: TrackRecord[],
  now: Date = new Date(),
): Promise<Business> {
  const audit = store.getAudit(slug);
  const emails = await store.getEmailsFor(slug);
  const effStatus = deriveStatus(pipe, pipe.sentDate, now);
  return {
    slug,
    name: audit?.name ?? slug,
    trade: audit?.trade ?? '',
    city: audit?.city ?? '',
    rank: audit?.rank ?? 0,
    rating: audit?.rating ?? 0,
    reviewCount: audit?.reviewCount ?? 0,
    passCount: audit?.passCount ?? 0,
    failCount: audit?.failCount ?? 0,
    score: audit ? computeScore(audit) : 0,
    status: effStatus,
    sentDate: pipe.sentDate,
    followUpCounter: pipe.followUpCounter,
    emailCount: emails.length,
    open: openStateFor(slug, emails, opens),
  };
}

export async function toDetail(slug: string, now: Date = new Date()): Promise<BusinessDetail | null> {
  const pipe = await store.getPipeline(slug);
  if (!pipe) return null;
  const audit = store.getAudit(slug);
  const opens = await store.getOpens();
  const emails = await store.getEmailsFor(slug);
  const b = await toBusiness(slug, pipe, opens, now);
  return {
    ...b,
    website: audit?.website ?? '',
    phone: audit?.phone ?? '',
    address: audit?.address ?? '',
    searchTerm: audit?.searchTerm ?? '',
    serviceArea: audit?.serviceArea ?? '',
    trafficPerMonth: audit?.trafficPerMonth ?? 0,
    trafficLossPct: audit?.trafficLossPct ?? 0,
    trafficLossCalls: audit?.trafficLossCalls ?? 0,
    findings: audit?.findings ?? [],
    competitors: audit?.competitors ?? [],
    emails: emails.map((e) => ({ ...e, sender: 'nas@nasyhub.com' })),
    notes: pipe.notes,
  };
}

export async function listBusinesses(now: Date = new Date()): Promise<Business[]> {
  const pipes = await store.getAllPipeline();
  const opens = await store.getOpens();
  const out: Business[] = [];
  for (const slug of Object.keys(pipes)) {
    out.push(await toBusiness(slug, pipes[slug], opens, now));
  }
  return out.sort((a, b) => {
    // Needs-attention first, then alphabetical.
    const aAtt = needsFollowUp(a.status) ? 1 : 0;
    const bAtt = needsFollowUp(b.status) ? 1 : 0;
    if (aAtt !== bAtt) return bAtt - aAtt;
    return a.name.localeCompare(b.name);
  });
}
