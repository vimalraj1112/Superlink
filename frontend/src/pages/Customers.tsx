import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronUp, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { customerApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import CustomerForm from '@/components/forms/CustomerForm';
import type { Customer } from '@/types/models';
import { toast } from 'sonner';

export default function Customers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', page, limit, search, isActiveFilter, sortBy, sortOrder],
    queryFn: () => customerApi.list({ page, limit, search, isActive: isActiveFilter, sortBy, sortOrder }),
    placeholderData: (previousData) => previousData,
  });

  const columns = [
    {
      key: 'customerCode',
      header: 'Code',
      sortable: true,
      render: (row: Customer) => (
        <span className="font-mono text-sm text-primary-600">{row.customerCode}</span>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      render: (row: Customer) => (
        <div>
          <p className="font-medium text-gray-900">{row.companyName}</p>
          <p className="text-sm text-gray-500">{row.contactPerson}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row: Customer) => (
        <a href={`mailto:${row.email}`} className="text-primary-600 hover:underline text-sm">{row.email}</a>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (row: Customer) => (
        <a href={`tel:${row.phone}`} className="text-primary-600 hover:underline text-sm">{row.phone}</a>
      ),
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
      render: (row: Customer) => (
        <StatusBadge type="custom" value={row.isActive ? 'active' : 'inactive'} label={row.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Customer) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/customers/${row.id}`)}
            className="btn btn-ghost btn-sm"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingCustomer(row); setFormModalOpen(true); }}
            className="btn btn-ghost btn-sm"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCustomerToDelete(row);
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
    if (!customerToDelete) return;

    try {
      await customerApi.delete(customerToDelete.id);
      toast.success('Customer deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete customer';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer accounts and contacts</p>
        </div>
    <button onClick={() => { setEditingCustomer(null); setFormModalOpen(true); }} className="btn btn-primary">
      <Plus className="w-4 h-4 mr-2" />
      Add Customer
    </button>
  </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
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
                <option value="companyName">Company Name</option>
                <option value="customerCode">Customer Code</option>
                <option value="email">Email</option>
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

        <DataTable<Customer>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No customers found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/customers/${row.id}`)}
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
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Customer"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{customerToDelete?.companyName}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              Delete
            </button>
          </div>
        </Modal>
      )}

      <CustomerForm
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingCustomer(null); }}
        initialData={editingCustomer}
      />
    </div>
  );
}