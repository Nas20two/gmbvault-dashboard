import type { Status } from '../types';
import { STATUS_META } from '../lib/status';

export default function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}
