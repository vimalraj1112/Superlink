import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  MapPin,
  TicketCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Wifi,
} from 'lucide-react';
import { customerApi, siteApi, ticketApi, ispApi } from '@/api/endpoints';
import StatusBadge from '@/components/common/StatusBadge';
import type { Ticket } from '@/types/models';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  link: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, link, subtitle }: StatCardProps) {
  return (
    <Link to={link} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: customersData } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => customerApi.list({ limit: 1 }),
  });

  const { data: sitesData } = useQuery({
    queryKey: ['dashboard-sites'],
    queryFn: () => siteApi.list({ limit: 1 }),
  });

  const { data: ticketsData } = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: () => ticketApi.list({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const { data: openTicketsData } = useQuery({
    queryKey: ['dashboard-open-tickets'],
    queryFn: () => ticketApi.list({ limit: 1, status: 'OPEN' }),
  });

  const { data: ispsData } = useQuery({
    queryKey: ['dashboard-isps'],
    queryFn: () => ispApi.list({ limit: 1 }),
  });

  const totalCustomers = customersData?.data?.meta?.total || 0;
  const totalSites = sitesData?.data?.meta?.total || 0;
  const totalTickets = ticketsData?.data?.meta?.total || 0;
  const openTickets = openTicketsData?.data?.meta?.total || 0;
  const totalIsps = ispsData?.data?.meta?.total || 0;
  const recentTickets: Ticket[] = ticketsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to SuperLink CRM overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Customers"
          value={totalCustomers}
          icon={Users}
          color="bg-blue-100 text-blue-600"
          link="/customers"
          subtitle="Total clients"
        />
        <StatCard
          title="Sites"
          value={totalSites}
          icon={MapPin}
          color="bg-green-100 text-green-600"
          link="/sites"
          subtitle="Customer sites"
        />
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-600"
          link="/tickets?status=OPEN"
          subtitle="Need attention"
        />
        <StatCard
          title="ISPs"
          value={totalIsps}
          icon={Wifi}
          color="bg-purple-100 text-purple-600"
          link="/isps"
          subtitle="Provider directory"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
            <Link to="/tickets" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No tickets yet</div>
            ) : (
              recentTickets.map(ticket => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary-600">{ticket.ticketNumber}</span>
                        <StatusBadge type="ticket-status" value={ticket.status} />
                        <StatusBadge type="ticket-priority" value={ticket.priority} />
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">{ticket.customer?.companyName}</p>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/customers" className="btn btn-secondary w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Add Customer
              </Link>
              <Link to="/sites" className="btn btn-secondary w-full justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Add Site
              </Link>
              <Link to="/tickets" className="btn btn-secondary w-full justify-start">
                <TicketCheck className="w-4 h-4 mr-2" />
                Create Ticket
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API</span>
                <span className="badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="badge-success">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Telegram Bot</span>
                <span className="badge-warning">Configure</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">WhatsApp API</span>
                <span className="badge-gray">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}