import type { EmailRecord } from '../types';
import { friendlyDate } from '../lib/helpers';

export default function EmailThread({ emails }: { emails: EmailRecord[] }) {
  const sorted = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-gray-500">No emails yet.</p>
      ) : (
        sorted.map((e) => (
          <div key={e.id} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">{e.subject}</p>
            <p className="text-xs text-gray-500">{friendlyDate(e.date)} · to {e.recipient}</p>
            {e.body && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{e.body}</p>}
          </div>
        ))
      )}
    </div>
  );
}
