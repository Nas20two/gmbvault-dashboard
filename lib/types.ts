// Internal pipeline statuses — NEVER shown to the user (THORN §10).
export type Status =
  | 'drafted'
  | 'sent'
  | 'followup_1'
  | 'followup_2'
  | 'replied'
  | 'converted';

export interface PipelineState {
  slug: string;
  status: Status;
  followUpCounter: number; // how many follow-ups have been sent (0..2)
  sentDate: string | null; // ISO date of last message sent
  repliedDate: string | null;
  convertedDate: string | null;
  notes: string;
  version: number;
}

// One business as presented to the dashboard (joined ALL_DATA + pipeline + opens).
export interface Business {
  slug: string;
  name: string;
  trade: string;
  city: string;
  rank: number;
  rating: number;
  reviewCount: number;
  passCount: number;
  failCount: number;
  score: number; // profile-health % = pass/(pass+fail)
  status: Status;
  sentDate: string | null;
  followUpCounter: number;
  emailCount: number;
  open: OpenState;
}

export type OpenState = 'opened' | 'unopened' | 'untracked';

export interface BusinessDetail extends Business {
  website: string;
  phone: string;
  address: string;
  searchTerm: string;
  serviceArea: string;
  trafficPerMonth: number;
  trafficLossPct: number;
  trafficLossCalls: number;
  findings: Finding[];
  competitors: Competitor[];
  emails: EmailRecord[];
  notes: string;
}

export interface Finding {
  icon: string;
  label: string;
  status: string;
  desc: string;
}

export interface Competitor {
  name: string;
  rating: number;
  reviews: number;
  photos: number;
  responds: boolean;
  rank: number;
}

export interface EmailRecord {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  body: string;
}

export interface TrackRecord {
  slug: string;
  emailHash: string;
  timestamp: string;
}
