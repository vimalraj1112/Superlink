import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { siteApi, customerApi, ispApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import SiteForm from '@/components/forms/SiteForm';
import type { Site } from '@/types/models';
import { SiteStatus, SiteStatusLabels } from '@/types/enums';
import { toast } from 'sonner';

export default function Sites() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SiteStatus | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [ispId, setIspId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sites', page, limit, search, status, customerId, ispId, sortBy, sortOrder],
    queryFn: () => siteApi.list({
      page,
      limit,
      search,
      status: status || undefined,
      customerId: customerId || undefined,
      ispId: ispId || undefined,
      sortBy,
      sortOrder,
    }),
    placeholderData: previousData => previousData,
  });

  const { data: customersData } = useQuery({
    queryKey: ['site-filter-customers'],
    queryFn: () => customerApi.list({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
  });

  const { data: ispsData } = useQuery({
    queryKey: ['site-filter-isps'],
    queryFn: () => ispApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  const handleDelete = async () => {
    if (!siteToDelete) return;

    try {
      await siteApi.delete(siteToDelete.id);
      toast.success('Site deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setSiteToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete site';
      toast.error(message);
    }
  };

  const columns = [
    {
      key: 'siteCode',
      header: 'Site Code',
      sortable: true,
      render: (row: Site) => <span className="font-mono text-sm text-primary-600">{row.siteCode}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: false,
      render: (row: Site) => (
        <div>
          <p className="font-medium text-gray-900">{row.customer?.companyName || '-'}</p>
          <p className="text-sm text-gray-500">{row.customer?.customerCode}</p>
        </div>
      ),
    },
    {
      key: 'planName',
      header: 'Plan',
      sortable: true,
      render: (row: Site) => (
        <div>
          <p className="font-medium text-gray-900">{row.planName}</p>
          <p className="text-sm text-gray-500">{row.bandwidth}</p>
        </div>
      ),
    },
    {
      key: 'isp',
      header: 'ISP',
      sortable: false,
      render: (row: Site) => row.isp?.displayName || row.isp?.name || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Site) => <StatusBadge type="site" value={row.status} />,
    },
    {
      key: 'mrc',
      header: 'MRC',
      sortable: true,
      render: (row: Site) => `₹${Number(row.mrc || 0).toLocaleString()}`,
    },
    {
      key: 'renewalDate',
      header: 'Renewal',
      sortable: true,
      render: (row: Site) => row.renewalDate ? new Date(row.renewalDate).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Site) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/sites/${row.id}`)} className="btn btn-ghost btn-sm" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditingSite(row); setFormModalOpen(true); }} className="btn btn-ghost btn-sm" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSiteToDelete(row);
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
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-600 mt-1">Manage customer internet sites and renewals</p>
        </div>
        <button onClick={() => { setEditingSite(null); setFormModalOpen(true); }} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sites..."
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
            className={clsx('btn btn-secondary gap-2', showFilters && 'bg-primary-50 text-primary-700 border-primary-200')}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select value={status} onChange={e => { setStatus(e.target.value as SiteStatus | ''); setPage(1); }} className="input text-sm">
              <option value="">All Statuses</option>
              {Object.values(SiteStatus).map(value => (
                <option key={value} value={value}>{SiteStatusLabels[value]}</option>
              ))}
            </select>
            <select value={customerId} onChange={e => { setCustomerId(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Customers</option>
              {(customersData?.data?.data || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.companyName}</option>
              ))}
            </select>
            <select value={ispId} onChange={e => { setIspId(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All ISPs</option>
              {(ispsData?.data?.data || []).map((isp: any) => (
                <option key={isp.id} value={isp.id}>{isp.displayName || isp.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm">
                <option value="createdAt">Created Date</option>
                <option value="siteCode">Site Code</option>
                <option value="planName">Plan</option>
                <option value="renewalDate">Renewal Date</option>
              </select>
              <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="btn btn-secondary px-3">
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <DataTable<Site>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No sites found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/sites/${row.id}`)}
          sortable
          defaultSortKey="createdAt"
          defaultSortOrder="desc"
          pagination={data?.data?.meta ? {
            page: data.data.meta.page,
            limit: data.data.meta.limit,
            total: data.data.meta.totalItems,
            totalPages: data.data.meta.totalPages,
            onPageChange: (p: number) => setPage(p),
            onLimitChange: (l: number) => setLimit(l),
          } : undefined}
          searchable={false}
        />
      </div>

      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Site">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{siteToDelete?.siteCode}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}

      <SiteForm
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingSite(null); }}
        initialData={editingSite}
      />
    </div>
  );
}
