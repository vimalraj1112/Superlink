import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, FileText, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { quotationApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Quotation } from '@/types/models';
import { toast } from 'sonner';

export default function Quotations() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quotations', page, limit, search, statusFilter, sortBy, sortOrder],
    queryFn: () => quotationApi.list({
      page,
      limit,
      search,
      status: statusFilter || undefined,
      sortBy,
      sortOrder,
    }),
    placeholderData: previousData => previousData,
  });

  const handleDelete = async () => {
    if (!quotationToDelete) return;

    try {
      await quotationApi.delete(quotationToDelete.id);
      toast.success('Quotation deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setQuotationToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete quotation';
      toast.error(message);
    }
  };

  const columns = [
    {
      key: 'quotationNumber',
      header: 'Quotation #',
      sortable: true,
      render: (row: Quotation) => (
        <span className="font-mono text-sm text-brand-600">{row.quotationNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row: Quotation) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 truncate">{row.title}</p>
          <p className="text-sm text-gray-500 truncate">{row.customer?.companyName || '-'}</p>
        </div>
      ),
    },
    {
      key: 'site',
      header: 'Site',
      sortable: false,
      render: (row: Quotation) => row.site?.siteCode || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Quotation) => (
        <StatusBadge type="custom" value={row.status.toLowerCase()} label={row.status} />
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (row: Quotation) => (
        <span className="font-medium text-gray-900">₹{row.totalAmount.toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'validityDate',
      header: 'Valid Until',
      sortable: true,
      render: (row: Quotation) => (
        <span className="text-gray-900">{new Date(row.validityDate).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Quotation) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/quotations/${row.id}`)} className="btn btn-ghost btn-sm" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/quotations/${row.id}/edit`)} className="btn btn-ghost btn-sm" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setQuotationToDelete(row);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 mt-1">Manage sales quotations</p>
        </div>
        <Link to="/quotations/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Quotation
        </Link>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotations..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn btn-secondary gap-2', showFilters && 'bg-brand-50 text-brand-700 border-brand-200')}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
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
                <option value="createdAt">Created Date</option>
                <option value="quotationNumber">Quotation Number</option>
                <option value="totalAmount">Total Amount</option>
                <option value="validityDate">Validity Date</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="btn btn-secondary p-1.5"
                title="Toggle sort order"
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {(statusFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                }}
                className="btn btn-secondary text-sm gap-2"
              >
                <ChevronUp className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}

        <DataTable<Quotation>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No quotations found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/quotations/${row.id}`)}
          sortable
          defaultSortKey="createdAt"
          defaultSortOrder="desc"
          pagination={data?.data?.meta ? {
            page: data.data.meta.page,
            limit: data.data.meta.limit,
            total: data.data.meta.total,
            totalPages: data.data.meta.totalPages,
            onPageChange: (p: number) => setPage(p),
            onLimitChange: (l: number) => setLimit(l),
          } : undefined}
          searchable={false}
        />
      </div>

      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Quotation">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{quotationToDelete?.quotationNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}