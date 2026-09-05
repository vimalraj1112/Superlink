import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, Wifi, MapPin, Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ispApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import IspForm from '@/components/forms/IspForm';
import type { ISP } from '@/types/models';
import { toast } from 'sonner';

export default function Isps() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ispToDelete, setIspToDelete] = useState<ISP | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIsp, setEditingIsp] = useState<ISP | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['isps', page, limit, search, isActiveFilter, sortBy, sortOrder],
    queryFn: () => ispApi.list({
      page,
      limit,
      search,
      isActive: isActiveFilter,
      sortBy,
      sortOrder,
    }),
    placeholderData: previousData => previousData,
  });

  const closeIspForm = () => {
    setFormModalOpen(false);
    setEditingIsp(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!ispToDelete) return;

    try {
      await ispApi.delete(ispToDelete.id);
      toast.success('ISP deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setIspToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete ISP';
      toast.error(message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row: ISP) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.displayName}</p>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact',
      sortable: true,
      render: (row: ISP) => row.contactPerson || '-',
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row: ISP) => row.email ? <a href={`mailto:${row.email}`} className="text-primary-600 hover:underline text-sm">{row.email}</a> : '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (row: ISP) => row.phone ? <a href={`tel:${row.phone}`} className="text-primary-600 hover:underline text-sm">{row.phone}</a> : '-',
    },
    {
      key: 'city',
      header: 'City',
      sortable: true,
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (row: ISP) => (
        <StatusBadge type="custom" value={row.isActive ? 'active' : 'inactive'} label={row.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: ISP) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/isps/${row.id}`)} className="btn btn-ghost btn-sm" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditingIsp(row); setFormModalOpen(true); }} className="btn btn-ghost btn-sm" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIspToDelete(row);
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
          <h1 className="text-2xl font-bold text-gray-900">ISPs</h1>
          <p className="text-gray-600 mt-1">Manage Internet Service Provider directory</p>
        </div>
        <button onClick={() => { setEditingIsp(null); setFormModalOpen(true); }} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add ISP
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ISPs..."
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
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={isActiveFilter === undefined ? '' : String(isActiveFilter)}
                onChange={e => {
                  setIsActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true');
                  setPage(1);
                }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                <option value="name">Name</option>
                <option value="displayName">Display Name</option>
                <option value="city">City</option>
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

        <DataTable<ISP>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No ISPs found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/isps/${row.id}`)}
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
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete ISP">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{ispToDelete?.displayName || ispToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}

      <IspForm isOpen={formModalOpen} onClose={closeIspForm} initialData={editingIsp} />
    </div>
  );
}