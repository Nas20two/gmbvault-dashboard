import type { Status } from './types';

// The one constant that drives the whole clock (THORN §10).
export const FOLLOW_UP_DAYS = 5;

export interface StatusMeta {
  label: string;
  color: string; // tailwind bg + text classes
  chip: string; // dot color
}

export const STATUS_META: Record<Status, StatusMeta> = {
  drafted: { label: 'Not sent yet', color: 'bg-drafted text-white', chip: 'bg-drafted' },
  sent: { label: 'Waiting to hear back', color: 'bg-sent text-white', chip: 'bg-sent' },
  followup_1: { label: 'Needs a follow-up', color: 'bg-followup_1 text-white', chip: 'bg-followup_1' },
  followup_2: { label: 'One more check-in', color: 'bg-followup_2 text-white', chip: 'bg-followup_2' },
  replied: { label: 'They replied', color: 'bg-replied text-white', chip: 'bg-replied' },
  converted: { label: 'New client', color: 'bg-converted text-white', chip: 'bg-converted' },
};

export type Filter = 'all' | Exclude<Status, 'drafted'>;

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All businesses' },
  { key: 'followup_1', label: 'Needs a follow-up' },
  { key: 'followup_2', label: 'One more check-in' },
  { key: 'sent', label: 'Waiting to hear back' },
  { key: 'replied', label: 'They replied' },
  { key: 'converted', label: 'New clients' },
];

export const NEEDS_ATTENTION: Status[] = ['followup_1', 'followup_2'];

export function needsFollowUp(status: Status): status is 'followup_1' | 'followup_2' {
  return status === 'followup_1' || status === 'followup_2';
}

// Auto-advance: sent -> followup_1 -> followup_2 as time passes with no reply.
// Returns the auto-advanced status for a business, given when the last message was sent.
export function deriveStatus(
  state: { status: Status; followUpCounter: number },
  sentDate: string | null,
  now: Date = new Date(),
): Status {
  const { status, followUpCounter } = state;
  // A reply or conversion is terminal for the clock.
  if (status === 'replied' || status === 'converted') return status;
  // Drafted never enters the clock.
  if (status === 'drafted') return status;
  if (!sentDate) return status;

  const daysSince = (now.getTime() - new Date(sentDate).getTime()) / 86_400_000;
  if (status === 'sent' && daysSince >= FOLLOW_UP_DAYS) {
    // If we've sent 0 follow-ups yet, this is the 1st check-in. If we've sent 1,
    // this is the 2nd. If 2, we've exhausted nudges — stay on a gentle "waiting".
    if (followUpCounter === 0) return 'followup_1';
    if (followUpCounter === 1) return 'followup_2';
    return 'sent';
  }
  // followup_1/followup_2 stay as-is (the user drives the transition by tapping sent);
  // but a 2nd follow-up has no 3rd degree, so never auto-bump past followup_2.
  return status;
}
