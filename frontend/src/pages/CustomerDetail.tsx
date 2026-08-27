import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  CreditCard,
  FileText,
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { customerApi, siteApi, ticketApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Customer, Site, Ticket } from '@/types/models';
import { SiteStatus, TicketStatus, TicketPriority, TicketSource } from '@/types/enums';
import { toast } from 'sonner';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'tickets' | 'payments'>('overview');
  const [sitePage, setSitePage] = useState(1);
  const [siteLimit, setSiteLimit] = useState(10);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketLimit, setTicketLimit] = useState(10);
  const [deleteSiteModalOpen, setDeleteSiteModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const { data: customerData, isLoading: customerLoading, error: customerError, refetch: refetchCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.get(id!),
    enabled: !!id,
  });

  const { data: sitesData, isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ['customer-sites', id, sitePage],
    queryFn: () => siteApi.list({ page: sitePage, limit: 10, customerId: id, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: !!id,
  });

  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['customer-tickets', id, ticketPage],
    queryFn: () => ticketApi.list({ page: ticketPage, limit: 10, customerId: id, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: !!id,
  });

  const customer = customerData?.data?.data;

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;

    try {
      await siteApi.delete(siteToDelete.id);
      toast.success('Site deleted successfully');
      refetchSites();
      refetchCustomer();
      setDeleteSiteModalOpen(false);
      setSiteToDelete(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete site';
      toast.error(message);
    }
  };

  if (customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Customer not found</h2>
          <Link to="/customers" className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const overviewTabs = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'sites', label: 'Sites', icon: MapPinIcon },
    { key: 'tickets', label: 'Tickets', icon: FileText },
    { key: 'payments', label: 'Payments', icon: CreditCard },
  ];

  const siteColumns = [
    {
      key: 'siteCode',
      header: 'Site Code',
      sortable: true,
      render: (row: Site) => (
        <span className="font-mono text-sm text-primary-600">{row.siteCode}</span>
      ),
    },
    {
      key: 'planName',
      header: 'Plan',
      sortable: true,
    },
    {
      key: 'bandwidth',
      header: 'Bandwidth',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Site) => (
        <StatusBadge type="site" value={row.status} />
      ),
    },
    {
      key: 'mrc',
      header: 'MRC',
      sortable: true,
      render: (row: Site) => `₹${row.mrc.toLocaleString()}`,
    },
    {
      key: 'renewalDate',
      header: 'Renewal Date',
      sortable: true,
      render: (row: Site) => row.renewalDate ? new Date(row.renewalDate).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: Site) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            to={`/sites/${row.id}`}
            className="btn btn-ghost btn-sm"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/sites/${row.id}/edit`}
            className="btn btn-ghost btn-sm"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setSiteToDelete(row);
              setDeleteSiteModalOpen(true);
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

  const ticketColumns = [
    {
      key: 'ticketNumber',
      header: 'Ticket #',
      sortable: true,
      render: (row: Ticket) => (
        <span className="font-mono text-sm text-primary-600">{row.ticketNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Ticket) => (
        <StatusBadge type="ticket-status" value={row.status} />
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row: Ticket) => (
        <StatusBadge type="ticket-priority" value={row.priority} />
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row: Ticket) => (
        <StatusBadge type="ticket-source" value={row.source} />
      ),
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
        <Link
          to={`/tickets/${row.id}`}
          className="btn btn-secondary text-sm px-3 py-1"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="btn btn-secondary gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Link to={`/customers/${customer.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <Link to="/sites/new" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Site
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
              <p className="text-gray-600 mt-1">{customer.customerCode} • {customer.contactPerson}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge
                type="custom"
                value={customer.isActive ? 'active' : 'inactive'}
                label={customer.isActive ? 'Active' : 'Inactive'}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-4" aria-label="Customer tabs">
            {overviewTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-medium text-gray-900">{customer.contactPerson}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${customer.email}`} className="font-medium text-primary-600 hover:underline">{customer.email}</a>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Phone</p>
                  <a href={`tel:${customer.phone}`} className="font-medium text-primary-600 hover:underline">{customer.phone}</a>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">City</p>
                  <p className="font-medium text-gray-900">{customer.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
                  <address className="text-gray-600 not-italic">
                    {customer.address}<br />
                    {customer.city}, {customer.state} {customer.pincode}
                  </address>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Details</h3>
                  <div className="space-y-2 text-gray-600">
                    {customer.gstNumber && <p><strong>GST:</strong> {customer.gstNumber}</p>}
                    {customer.panNumber && <p><strong>PAN:</strong> {customer.panNumber}</p>}
                    {customer.billingAddress && (
                      <address className="not-italic">
                        {customer.billingAddress}<br />
                        {customer.billingCity}, {customer.billingState} {customer.billingPincode}
                      </address>
                    )}
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sites' && (
            <div>
              <DataTable<Site>
                data={sitesData?.data?.data || []}
                columns={siteColumns}
                loading={sitesLoading}
                emptyMessage="No sites found for this customer"
                rowKey={row => row.id}
                sortable
                defaultSortKey="createdAt"
                defaultSortOrder="desc"
                pagination={sitesData?.data?.meta ? {
                  page: sitesData.data.meta.page,
                  limit: sitesData.data.meta.limit,
                  total: sitesData.data.meta.total,
                  totalPages: sitesData.data.meta.totalPages,
                  onPageChange: (p: number) => setSitePage(p),
                  onLimitChange: (l: number) => setSiteLimit(l),
                } : undefined}
              />
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <DataTable<Ticket>
                data={ticketsData?.data?.data || []}
                columns={ticketColumns}
                loading={ticketsLoading}
                emptyMessage="No tickets found for this customer"
                rowKey={row => row.id}
                sortable
                defaultSortKey="createdAt"
                defaultSortOrder="desc"
                pagination={ticketsData?.data?.meta ? {
                  page: ticketsData.data.meta.page,
                  limit: ticketsData.data.meta.limit,
                  total: ticketsData.data.meta.total,
                  totalPages: ticketsData.data.meta.totalPages,
                  onPageChange: (p: number) => setTicketPage(p),
                  onLimitChange: (l: number) => setTicketLimit(l),
                } : undefined}
              />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Payments tab coming soon</p>
              <p className="text-sm mt-1">Payment history and billing records will appear here</p>
            </div>
          )}
        </div>
      </div>

      {deleteSiteModalOpen && (
        <Modal
          isOpen={deleteSiteModalOpen}
          onClose={() => setDeleteSiteModalOpen(false)}
          title="Delete Site"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{siteToDelete?.siteCode}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteSiteModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleDeleteSite} className="btn btn-danger">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}