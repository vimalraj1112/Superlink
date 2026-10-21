import { AlertTriangle } from 'lucide-react';

/** Renewals within this many days (or already overdue) are flagged in red. */
export const RENEWAL_DUE_DAYS = 7;

export default function RenewalCell({ date }: { date?: string | null }) {
  if (!date) return <span className="text-gray-400">—</span>;

  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return <span className="text-gray-400">—</span>;

  const days = Math.ceil((time - Date.now()) / 86_400_000);

  if (days > RENEWAL_DUE_DAYS) {
    return <span className="text-sm text-gray-600">{new Date(date).toLocaleDateString()}</span>;
  }

  const label =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? 'Due today'
        : `Due in ${days}d`;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-sm font-medium text-red-700"
      title={`Renewal date: ${new Date(date).toLocaleDateString()}`}
    >
      <AlertTriangle className="h-4 w-4" />
      {label}
    </span>
  );
}
