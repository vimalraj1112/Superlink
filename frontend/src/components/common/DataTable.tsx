import { forwardRef, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { PaginatedResponse } from '@/types/api';

interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: readonly (Column<T> | Column<any>)[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pagination?: PaginationProps;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  rowKey,
  onRowClick,
  sortable = true,
  defaultSortKey,
  defaultSortOrder = 'asc',
  pagination,
  searchable = false,
  searchPlaceholder = 'Search...',
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [searchTerm, setSearchTerm] = useState('');

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey]);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key as keyof T];
          return String(value).toLowerCase().includes(term);
        })
      );
    }

    if (sortKey && sortable) {
      const column = columns.find(c => c.key === sortKey);
      if (column?.sortable !== false) {
        result.sort((a, b) => {
          const aVal = a[sortKey as keyof T];
          const bVal = b[sortKey as keyof T];
          if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, searchTerm, sortKey, sortOrder, columns, sortable]);

  const handleSort = (key: string) => {
    if (!sortable) return;
    const column = columns.find(c => c.key === key);
    if (column?.sortable === false) return;

    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ key }: { key: string }) => {
    if (sortKey !== key) return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-600" />
    );
  };

  if (loading) {
    return (
      <div className={clsx('card overflow-hidden', className)}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('card overflow-hidden', className)}>
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
                    column.headerClassName,
                    column.sortable !== false && sortable && 'cursor-pointer select-none hover:bg-gray-100'
                  )}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable !== false && sortable && <SortIcon key={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={getRowKey(row)}
                  className={clsx(
                    onRowClick && 'cursor-pointer hover:bg-gray-50 transition-colors',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-4 py-3 text-sm text-gray-900',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row, index)
                        : String(row[column.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pagination.limit}
              onChange={e => pagination.onLimitChange(Number(e.target.value))}
              className="input py-1 px-2 text-sm w-auto"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn btn-secondary px-3 py-1 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="btn btn-secondary px-3 py-1 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;