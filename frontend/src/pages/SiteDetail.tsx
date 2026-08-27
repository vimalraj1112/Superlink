import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Wifi,
  MapPin,
  DollarSign,
  Calendar,
  Hash,
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  TicketCheck,
  CreditCard,
  FileText,
  MapPin as MapPinIcon,
  Key,
  Lock,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { siteApi, ticketApi, paymentApi, credentialsApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Site, Ticket, Payment } from '@/types/models';
import { SiteStatus, TicketStatus, TicketPriority, TicketSource, PaymentType } from '@/types/enums';
import { toast } from 'sonner';

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'payments' | 'credentials'>('overview');
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketLimit, setTicketLimit] = useState(10);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentLimit, setPaymentLimit] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [revealField, setRevealField] = useState<'password' | 'pppoePassword' | null>(null);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [revealedType, setRevealedType] = useState<'password' | 'pppoePassword' | null>(null);

  const { data: siteData, isLoading: siteLoading, error: siteError, refetch: refetchSite } = useQuery({
    queryKey: ['site', id],
    queryFn: () => siteApi.get(id!),
    enabled: !!id,
  });

  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['site-tickets', id, ticketPage],
    queryFn: () => ticketApi.list({ page: ticketPage, limit: 10, siteId: id, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: !!id,
  });

  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['site-payments', id, paymentPage],
    queryFn: () => paymentApi.list({ page: paymentPage, limit: 10, siteId: id, sortBy: 'paymentDate', sortOrder: 'desc' }),
    enabled: !!id,
  });

  const { data: credentialsData, isLoading: credentialsLoading, refetch: refetchCredentials } = useQuery({
    queryKey: ['site-credentials', id],
    queryFn: () => credentialsApi.getBySite(id!),
    enabled: !!id,
  });

  const revealMutation = useMutation({
    mutationFn: ({ siteId, field }: { siteId: string; field: 'password' | 'pppoePassword' }) =>
      credentialsApi.reveal(siteId, field),
    onSuccess: (response) => {
      const data = response.data;
      if (data.success && data.data?.value) {
        setRevealedValue(data.data.value);
      } else {
        toast.error(data.message || 'Failed to reveal credential');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reveal credential');
    },
  });

  const handleReveal = (siteId: string, field: 'password' | 'pppoePassword') => {
    setRevealField(field);
    revealMutation.mutate({ siteId, field });
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
    setRevealedValue(null);
    setRevealedType(null);
  };

  const site = siteData?.data?.data;
  const credentials = credentialsData?.data?.data;

  const handleDelete = async () => {
    if (!site) return;

    try {
      await siteApi.delete(site.id);
      toast.success('Site deleted successfully');
      navigate('/sites');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete site';
      toast.error(message);
    }
  };

  if (siteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (siteError || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Site not found</h2>
          <Link to="/sites" className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  const overviewTabs = [
    { key: 'overview', label: 'Overview', icon: MapPinIcon },
    { key: 'tickets', label: 'Tickets', icon: TicketCheck },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'credentials', label: 'Credentials', icon: Key },
  ];

  const ticketColumns = [
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
        <Link to={`/tickets/${row.id}`} className="btn btn-secondary text-sm px-3 py-1">View</Link>
      ),
    },
  ];

  const paymentColumns = [
    {
      key: 'paymentNumber',
      header: 'Payment #',
      sortable: true,
      render: (row: Payment) => <span className="font-mono text-sm text-primary-600">{row.paymentNumber}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row: Payment) => {
        const labels: Record<string, string> = { OTC: 'OTC', MRC: 'MRC', STATIC_IP: 'Static IP', OTHER: 'Other' };
        return <StatusBadge type="custom" value={row.type} label={labels[row.type] || row.type} className="bg-blue-100 text-blue-800" />;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row: Payment) => `₹${Number(row.amount).toLocaleString()}`,
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
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/sites" className="btn btn-secondary gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Link to={`/sites/${site.id}/edit`} className="btn btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button onClick={() => setDeleteModalOpen(true)} className="btn-danger">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{site.siteCode}</h1>
              <p className="text-gray-600 mt-1">{site.planName} • {site.bandwidth} • {site.customer?.companyName}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge type="site" value={site.status} />
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-4" aria-label="Site tabs">
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
                  <p className="text-sm text-gray-600">ISP</p>
                  <p className="font-medium text-gray-900">{site.isp?.displayName || site.isp?.name || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">MRC</p>
                  <p className="font-medium text-gray-900">₹{Number(site.mrc || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">OTC</p>
                  <p className="font-medium text-gray-900">₹{Number(site.otc || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Static IP Charge</p>
                  <p className="font-medium text-gray-900">₹{Number(site.staticIpCharge || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation Address</h3>
                  <address className="text-gray-600 not-italic">
                    {site.installationAddress}<br />
                    {site.installationCity}, {site.installationState} {site.installationPincode}
                  </address>
                  {site.latitude && site.longitude && (
                    <p className="text-sm text-gray-500 mt-2">
                      Coordinates: {site.latitude}, {site.longitude}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Renewal Date</p>
                        <p className="font-medium text-gray-900">
                          {site.renewalDate ? new Date(site.renewalDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Monthly</p>
                        <p className="font-medium text-gray-900">
                          ₹{(Number(site.mrc || 0) + Number(site.staticIpCharge || 0) + Number(site.otherCharges || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {site.connectionType && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Connection Type</p>
                          <p className="font-medium text-gray-900">{site.connectionType}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {site.circuitId && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Hash className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Circuit ID</p>
                          <p className="font-medium text-gray-900">{site.circuitId}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {site.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{site.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <DataTable<Ticket>
              data={ticketsData?.data?.data || []}
              columns={ticketColumns}
              loading={ticketsLoading}
              emptyMessage="No tickets for this site"
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
          )}

          {activeTab === 'payments' && (
            <DataTable<Payment>
              data={paymentsData?.data?.data || []}
              columns={paymentColumns}
              loading={paymentsLoading}
              emptyMessage="No payments for this site"
              rowKey={row => row.id}
              sortable
              defaultSortKey="paymentDate"
              defaultSortOrder="desc"
              pagination={paymentsData?.data?.meta ? {
                page: paymentsData.data.meta.page,
                limit: paymentsData.data.meta.limit,
                total: paymentsData.data.meta.total,
                totalPages: paymentsData.data.meta.totalPages,
                onPageChange: (p: number) => setPaymentPage(p),
                onLimitChange: (l: number) => setPaymentLimit(l),
              } : undefined}
            />
          )}

          {activeTab === 'credentials' && (
            <div>
              {credentials ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Router Credentials</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {credentials.username && (
                        <div>
                          <p className="text-sm text-gray-600">Username</p>
                          <p className="font-mono text-gray-900">{credentials.username}</p>
                        </div>
                      )}
                      {credentials.routerIp && (
                        <div>
                          <p className="text-sm text-gray-600">Router IP</p>
                          <p className="font-mono text-gray-900">{credentials.routerIp}</p>
                        </div>
                      )}
                      {credentials.routerModel && (
                        <div>
                          <p className="text-sm text-gray-600">Router Model</p>
                          <p className="font-mono text-gray-900">{credentials.routerModel}</p>
                        </div>
                      )}
                      {credentials.vlanId && (
                        <div>
                          <p className="text-sm text-gray-600">VLAN ID</p>
                          <p className="font-mono text-gray-900">{credentials.vlanId}</p>
                        </div>
                      )}
                      {credentials.hasPassword && (
                        <div className="flex items-end">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Password</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-900 flex-1">
                                {revealedType === 'password' && revealedValue ? revealedValue : '••••••••'}
                              </span>
                              {revealedType === 'password' && revealedValue ? (
                                <>
                                  <button
                                    onClick={() => handleCopy(revealedValue)}
                                    className="btn btn-secondary text-sm px-3 py-1.5"
                                    title="Copy"
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                  </button>
                                  <button
                                    onClick={() => { setRevealedValue(null); setRevealedType(null); }}
                                    className="btn btn-secondary text-sm px-3 py-1.5"
                                    title="Hide"
                                  >
                                    <EyeOff className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleReveal(id!, 'password')}
                                  disabled={revealMutation.isPending}
                                  className="btn btn-secondary text-sm px-3 py-1.5"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Reveal
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PPPoE Credentials</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {credentials.pppoeUsername && (
                        <div>
                          <p className="text-sm text-gray-600">PPPoE Username</p>
                          <p className="font-mono text-gray-900">{credentials.pppoeUsername}</p>
                        </div>
                      )}
                      {credentials.hasPppoePassword && (
                        <div className="flex items-end">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">PPPoE Password</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-900 flex-1">
                                {revealedType === 'pppoePassword' && revealedValue ? revealedValue : '••••••••'}
                              </span>
                              {revealedType === 'pppoePassword' && revealedValue ? (
                                <>
                                  <button
                                    onClick={() => handleCopy(revealedValue)}
                                    className="btn btn-secondary text-sm px-3 py-1.5"
                                    title="Copy"
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                  </button>
                                  <button
                                    onClick={() => { setRevealedValue(null); setRevealedType(null); }}
                                    className="btn btn-secondary text-sm px-3 py-1.5"
                                    title="Hide"
                                  >
                                    <EyeOff className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleReveal(id!, 'pppoePassword')}
                                  disabled={revealMutation.isPending}
                                  className="btn btn-secondary text-sm px-3 py-1.5"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Reveal
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {credentials.staticIps && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Static IPs</h3>
                      <pre className="text-sm text-gray-900 bg-white p-3 rounded border">{JSON.stringify(credentials.staticIps, null, 2)}</pre>
                    </div>
                  )}
                  {credentials.notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                      <p className="text-gray-600 whitespace-pre-wrap">{credentials.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Lock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No credentials stored</p>
                  <p className="text-sm mt-1">Add credentials from the edit page or credentials management</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Site">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{site.siteCode}</strong>? This action cannot be undone.
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