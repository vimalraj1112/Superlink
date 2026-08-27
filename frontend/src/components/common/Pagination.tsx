import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showLimitSelector?: boolean;
  limits?: number[];
  className?: string;
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  limits = [10, 25, 50, 100],
  className = '',
}: PaginationProps) {
  if (totalPages <= 1 && !showLimitSelector) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={clsx(
        'flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200',
        className
      )}
    >
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {total} results
      </div>

      <div className="flex items-center gap-2">
        {showLimitSelector && onLimitChange && (
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            className="input py-1 px-2 text-sm w-auto"
            aria-label="Items per page"
          >
            {limits.map(l => (
              <option key={l} value={l}>
                {l} per page
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="btn btn-secondary px-2 py-1 text-sm"
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary px-2 py-1 text-sm"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-gray-600 px-2 min-w-[80px] text-center">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary px-2 py-1 text-sm"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="btn btn-secondary px-2 py-1 text-sm"
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}