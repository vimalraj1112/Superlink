import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { paymentApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Payment } from '@/types/models';
import { PaymentType } from '@/types/enums';
import { toast } from 'sonner';

const paymentTypeLabels: Record<string, string> = {
  OTC: 'OTC',
  MRC: 'MRC',
  STATIC_IP: 'Static IP',
  OTHER: 'Other',
};

const paymentTypeColors: Record<string, string> = {
  OTC: 'bg-blue-100 text-blue-800',
  MRC: 'bg-green-100 text-green-800',
  STATIC_IP: 'bg-purple-100 text-purple-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export default function Payments() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payments', page, limit, search, typeFilter, dateFrom, dateTo, sortBy, sortOrder],
    queryFn: () => paymentApi.list({
      page,
      limit,
      search: search || undefined,
      type: typeFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
    }),
    placeholderData: (previousData) => previousData,
  });

  const columns = [
    {
      key: 'paymentNumber',
      header: 'Payment #',
      sortable: true,
      render: (row: Payment) => (
        <span className="font-mono text-sm text-primary-600">{row.paymentNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (row: Payment) => (
        <div>
          <p className="font-medium text-gray-900">{row.customer?.companyName}</p>
          <p className="text-sm text-gray-500">{row.customer?.customerCode}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row: Payment) => (
        <span className={clsx('badge', paymentTypeColors[row.type] || 'bg-gray-100 text-gray-800')}>
          {paymentTypeLabels[row.type] || row.type}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row: Payment) => (
        <span className="font-medium text-gray-900">₹{Number(row.amount).toLocaleString()}</span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Date',
      sortable: true,
      render: (row: Payment) => new Date(row.paymentDate).toLocaleDateString(),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      sortable: true,
      render: (row: Payment) => row.paymentMethod || '-',
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (row: Payment) => row.invoiceNumber || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Payment) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/payments/${row.id}`)}
            className="btn btn-ghost btn-sm"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/payments/${row.id}/edit`)}
            className="btn btn-ghost btn-sm"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setPaymentToDelete(row);
              setDeleteModalOpen(true);
            }}
            className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!paymentToDelete) return;
    try {
      await paymentApi.delete(paymentToDelete.id);
      toast.success('Payment deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setPaymentToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete payment';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Manage payment records and billing history</p>
        </div>
        <Link to="/payments/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Payment
        </Link>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'btn btn-secondary gap-2',
                showFilters && 'bg-primary-50 text-primary-700 border-primary-200'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="">All Types</option>
                <option value="OTC">OTC</option>
                <option value="MRC">MRC</option>
                <option value="STATIC_IP">Static IP</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={e => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="paymentDate">Payment Date</option>
                <option value="amount">Amount</option>
                <option value="paymentNumber">Payment Number</option>
                <option value="createdAt">Created Date</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="btn btn-secondary p-1.5"
                title="Toggle sort order"
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <DataTable<Payment>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No payments found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/payments/${row.id}`)}
          sortable
          defaultSortKey="paymentDate"
          defaultSortOrder="desc"
          pagination={data?.data?.meta ? {
            page: data.data.meta.page,
            limit: data.data.meta.limit,
            total: data.data.meta.totalItems,
            totalPages: data.data.meta.totalPages,
            onPageChange: (p: number) => setPage(p),
            onLimitChange: (l: number) => setLimit(l),
          } : undefined}
        />
      </div>

      {deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Payment"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete payment <strong>{paymentToDelete?.paymentNumber}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}