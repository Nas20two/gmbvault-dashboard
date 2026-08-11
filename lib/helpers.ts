import type { Business } from './types';
import { FOLLOW_UP_DAYS } from './status';

export function daysAgo(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

export function friendlyDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function nextCheckInDate(sentDate: string | null, now: Date = new Date()): string {
  const base = sentDate ? new Date(sentDate) : now;
  const next = new Date(base.getTime() + FOLLOW_UP_DAYS * 86_400_000);
  return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// THORN §4.5 — the one-line "what do I do" cue.
export function actionLine(b: Business, now: Date = new Date()): string {
  switch (b.status) {
    case 'followup_1':
      return `Following up — it's been waiting ${FOLLOW_UP_DAYS} days.`;
    case 'followup_2':
      return `One more check-in — it's been waiting a while.`;
    case 'sent': {
      const d = daysAgo(b.sentDate, now);
      if (d === null) return 'Check back in a few days.';
      return `Check back in ${Math.max(0, FOLLOW_UP_DAYS - d)} days.`;
    }
    case 'replied':
      return 'They replied.';
    case 'converted':
      return 'New client 🎉';
    default:
      return 'Not sent yet.';
  }
}

export function headline(needsAttention: number): string {
  if (needsAttention === 0) return 'All caught up — nothing needs a follow-up right now.';
  const noun = needsAttention === 1 ? 'business' : 'businesses';
  const verb = needsAttention === 1 ? 'needs' : 'need';
  return `Good morning. You have ${needsAttention} ${noun} that ${verb} a follow-up today.`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// THORN §4.5 tiny seen marker.
export function seenText(status: Business['open']): string {
  switch (status) {
    case 'opened': return '✅ Opened';
    case 'unopened': return '◌ Not seen yet';
    case 'untracked': return '— No tracker on this one';
  }
}
