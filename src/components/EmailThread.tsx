import type { EmailRecord } from '../types';
import { friendlyDate } from '../lib/helpers';

export default function EmailThread({ emails }: { emails: EmailRecord[] }) {
  const sorted = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-vault-muted">No emails yet.</p>
      ) : (
        sorted.map((e) => (
          <div key={e.id} className="rounded-xl border border-white/10 bg-vault-bg p-4">
            <p className="text-sm font-semibold text-vault-text">{e.subject}</p>
            <p className="text-xs text-vault-muted">{friendlyDate(e.date)} · to {e.recipient}</p>
            {e.body && <p className="mt-2 text-sm text-vault-muted whitespace-pre-wrap">{e.body}</p>}
          </div>
        ))
      )}
    </div>
  );
}
