import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { ticketApi, customerApi, siteApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Ticket } from '@/types/models';
import {
  TicketStatus,
  TicketStatusLabels,
  TicketPriority,
  TicketPriorityLabels,
  TicketSource,
  TicketSourceLabels,
} from '@/types/enums';
import { toast } from 'sonner';
import TicketForm from '@/components/forms/TicketForm';

export default function Tickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const isEditRoute = location.pathname.includes('/edit');
  const editId = isEditRoute ? location.pathname.split('/')[2] : null;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('');
  const [source, setSource] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(Boolean(initialStatus));
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(location.pathname === '/tickets/new');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Load ticket data for editing
  const { data: editTicketData, isLoading: editTicketLoading } = useQuery({
    queryKey: ['edit-ticket', editId],
    queryFn: () => ticketApi.get(editId!),
    enabled: isEditRoute && !!editId,
  });

  // Handle route changes for create/edit modals
  useEffect(() => {
    setCreateModalOpen(location.pathname === '/tickets/new');
  }, [location.pathname]);

  useEffect(() => {
    if (isEditRoute && editId && editTicketData?.data?.data) {
      setEditModalOpen(true);
    } else if (!isEditRoute) {
      setEditModalOpen(false);
    }
  }, [isEditRoute, editId, editTicketData]);

  const handleCreateClose = () => {
    setCreateModalOpen(false);
    if (location.pathname === '/tickets/new') {
      navigate('/tickets', { replace: true });
    }
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    if (isEditRoute) {
      navigate('/tickets', { replace: true });
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', page, limit, search, status, priority, source, customerId, siteId, sortBy, sortOrder],
    queryFn: () => ticketApi.list({
      page,
      limit,
      search,
      status: status || undefined,
      priority: priority || undefined,
      source: source || undefined,
      customerId: customerId || undefined,
      siteId: siteId || undefined,
      sortBy,
      sortOrder,
    }),
    placeholderData: previousData => previousData,
  });

  const { data: customersData } = useQuery({
    queryKey: ['ticket-filter-customers'],
    queryFn: () => customerApi.list({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
  });

  const { data: sitesData } = useQuery({
    queryKey: ['ticket-filter-sites', customerId],
    queryFn: () => siteApi.list({ limit: 100, customerId: customerId || undefined, sortBy: 'siteCode', sortOrder: 'asc' }),
  });

  const handleDelete = async () => {
    if (!ticketToDelete) return;

    try {
      await ticketApi.delete(ticketToDelete.id);
      toast.success('Ticket deleted successfully');
      refetch();
      setDeleteModalOpen(false);
      setTicketToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete ticket';
      toast.error(message);
    }
  };

  const columns = [
    {
      key: 'ticketNumber',
      header: 'Ticket #',
      sortable: true,
      render: (row: Ticket) => <span className="font-mono text-sm text-primary-600">{row.ticketNumber}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row: Ticket) => (
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
      render: (row: Ticket) => row.site?.siteCode || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Ticket) => <StatusBadge type="ticket-status" value={row.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row: Ticket) => <StatusBadge type="ticket-priority" value={row.priority} />,
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row: Ticket) => <StatusBadge type="ticket-source" value={row.source} />,
    },
    {
      key: 'assignedTo',
      header: 'Assigned',
      sortable: false,
      render: (row: Ticket) => row.assignedTo ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}` : 'Unassigned',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row: Ticket) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Ticket) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/tickets/${row.id}`)} className="btn btn-ghost btn-sm" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/tickets/${row.id}/edit`)} className="btn btn-ghost btn-sm" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setTicketToDelete(row);
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

  const totalTickets = data?.data?.meta?.total || 0;
  const openCount = status === TicketStatus.OPEN ? totalTickets : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">High-volume support queue for manual, Telegram, and WhatsApp tickets</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(TicketStatus).map(value => (
          <button
            key={value}
            onClick={() => {
              setStatus(status === value ? '' : value);
              setPage(1);
              setShowFilters(true);
            }}
            className={clsx(
              'card p-4 text-left hover:shadow-md transition-shadow',
              status === value && 'ring-2 ring-primary-500'
            )}
          >
            <p className="text-sm text-gray-600">{TicketStatusLabels[value]}</p>
            <div className="mt-2 flex items-center justify-between">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              {status === value ? <span className="text-2xl font-bold text-gray-900">{totalTickets}</span> : <StatusBadge type="ticket-status" value={value} />}
            </div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
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
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Statuses</option>
              {Object.values(TicketStatus).map(value => (
                <option key={value} value={value}>{TicketStatusLabels[value]}</option>
              ))}
            </select>
            <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Priorities</option>
              {Object.values(TicketPriority).map(value => (
                <option key={value} value={value}>{TicketPriorityLabels[value]}</option>
              ))}
            </select>
            <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Sources</option>
              {Object.values(TicketSource).map(value => (
                <option key={value} value={value}>{TicketSourceLabels[value]}</option>
              ))}
            </select>
            <select value={customerId} onChange={e => { setCustomerId(e.target.value); setSiteId(''); setPage(1); }} className="input text-sm">
              <option value="">All Customers</option>
              {(customersData?.data?.data || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.companyName}</option>
              ))}
            </select>
            <select value={siteId} onChange={e => { setSiteId(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Sites</option>
              {(sitesData?.data?.data || []).map((site: any) => (
                <option key={site.id} value={site.id}>{site.siteCode}</option>
              ))}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm">
              <option value="createdAt">Created Date</option>
              <option value="ticketNumber">Ticket Number</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
            <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="btn btn-secondary px-3">
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setStatus('');
                setPriority('');
                setSource('');
                setCustomerId('');
                setSiteId('');
                setSearch('');
                setPage(1);
              }}
              className="btn btn-secondary text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}

        <DataTable<Ticket>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No tickets found"
          rowKey={row => row.id}
          onRowClick={row => navigate(`/tickets/${row.id}`)}
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
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Ticket">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{ticketToDelete?.ticketNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}

      {/* Create Ticket Modal */}
      <TicketForm
        isOpen={createModalOpen}
        onClose={handleCreateClose}
      />

      {/* Edit Ticket Modal */}
      <TicketForm
        isOpen={editModalOpen}
        onClose={handleEditClose}
        initialData={editTicketData?.data?.data || null}
      />
    </div>
  );
}
