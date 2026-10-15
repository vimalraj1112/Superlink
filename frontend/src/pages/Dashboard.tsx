import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  MapPin,
  TicketCheck,
  AlertTriangle,
  Wifi,
  MessageSquare,
} from 'lucide-react';
import { customerApi, siteApi, ticketApi, ispApi, dashboardApi } from '@/api/endpoints';
import StatusBadge from '@/components/common/StatusBadge';
import type { Ticket } from '@/types/models';
import {
  TicketStatus,
  TicketStatusLabels,
} from '@/types/enums';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  link: string;
  subtitle?: string;
  delay?: number;
}

/** Animate a number from its previous value up to the target. */
function useCountUp(target: number, duration = 850) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      current.current = target;
      setValue(target);
      return;
    }

    const from = current.current;
    if (from === target) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function StatCard({ title, value, icon: Icon, accent, link, subtitle, delay = 0 }: StatCardProps) {
  const count = useCountUp(value);

  return (
    <Link
      to={link}
      style={{ '--card-delay': `${delay}ms` } as React.CSSProperties}
      className="card card-shine group p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
            {count}
          </p>
          {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
        </div>
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accent} opacity-40 blur-md transition-opacity duration-500 group-hover:opacity-75`}
          />
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-brand-500/20 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-110`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Fetch counts for all ticket statuses
function useTicketStatusCounts() {
  const statuses = Object.values(TicketStatus);

  const queries = statuses.map(status =>
    useQuery({
      queryKey: ['dashboard-ticket-status', status],
      queryFn: () => ticketApi.list({ limit: 1, status }),
    })
  );

  const counts: Record<string, number> = {};
  statuses.forEach((status, index) => {
    counts[status] = queries[index]?.data?.data?.meta?.totalItems || 0;
  });

  const total = statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);

  return { counts, total };
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

  const { counts: ticketStatusCounts, total: totalTickets } = useTicketStatusCounts();

  const { data: ispsData } = useQuery({
    queryKey: ['dashboard-isps'],
    queryFn: () => ispApi.list({ limit: 1 }),
  });

  // Renewals due within the next 2 days (includes already-overdue)
  const { data: renewalsData } = useQuery({
    queryKey: ['dashboard-renewals'],
    queryFn: () => dashboardApi.getRenewals(),
  });

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const dueRenewals = (renewalsData?.data?.data || []).filter((site: any) => {
    const due = new Date(site.renewalDate).getTime();
    return !isNaN(due) && due <= Date.now() + TWO_DAYS_MS;
  });

  const totalCustomers = customersData?.data?.meta?.totalItems || 0;
  const totalSites = sitesData?.data?.meta?.totalItems || 0;
  const totalIsps = ispsData?.data?.meta?.totalItems || 0;
  const recentTickets: Ticket[] = ticketsData?.data?.data || [];

  const statusColors: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-700 border-orange-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
    RESOLVED: 'bg-green-100 text-green-700 border-green-200',
    CLOSED: 'bg-slate-100 text-gray-700 border-gray-200',
  };

  const statusIcons: Record<string, React.ElementType> = {
    OPEN: AlertTriangle,
    IN_PROGRESS: TicketCheck,
    RESOLVED: MessageSquare,
    CLOSED: MessageSquare,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to SuperLink CRM overview</p>
      </div>

      {dueRenewals.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-amber-900">
                {dueRenewals.length} renewal{dueRenewals.length > 1 ? 's' : ''} due within 2 days
              </h2>
              <ul className="mt-2 space-y-1.5">
                {dueRenewals.map((site: any) => {
                  const days = Math.ceil((new Date(site.renewalDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                  const daysLabel = days < 0
                    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                    : days === 0
                      ? 'Due today'
                      : `Due in ${days} day${days === 1 ? '' : 's'}`;
                  return (
                    <li key={site.id}>
                      <Link to={`/sites/${site.id}`} className="flex items-center justify-between gap-3 text-sm hover:underline">
                        <span className="text-amber-900 font-medium truncate">
                          {site.siteCode} — {site.customer?.companyName || '-'}
                        </span>
                        <span className={clsx('text-xs font-medium whitespace-nowrap', days < 0 ? 'text-red-600' : 'text-amber-700')}>
                          {daysLabel}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Customers"
          value={totalCustomers}
          icon={Users}
          accent="from-teal-400 to-cyan-600"
          link="/customers"
          subtitle="Total clients"
          delay={0}
        />
        <StatCard
          title="Sites"
          value={totalSites}
          icon={MapPin}
          accent="from-emerald-400 to-teal-600"
          link="/sites"
          subtitle="Customer sites"
          delay={80}
        />
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={TicketCheck}
          accent="from-fuchsia-500 to-purple-600"
          link="/tickets"
          subtitle="All tickets"
          delay={160}
        />
        <StatCard
          title="ISPs"
          value={totalIsps}
          icon={Wifi}
          accent="from-sky-400 to-indigo-600"
          link="/isps"
          subtitle="Provider directory"
          delay={240}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(TicketStatus).map(status => (
          <button
            key={status}
            onClick={() => window.location.href = `/tickets?status=${status}`}
            className={clsx(
              'card p-4 text-left hover:shadow-md transition-shadow',
              statusColors[status] || 'bg-slate-50 text-gray-700 border-gray-200'
            )}
          >
            <p className="text-sm text-gray-600">{TicketStatusLabels[status]}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="w-5 h-5 text-gray-400">
                {React.createElement(statusIcons[status], { className: 'w-5 h-5' })}
              </div>
              <span className="text-2xl font-bold text-gray-900">{ticketStatusCounts[status] || 0}</span>
            </div>
          </button>
        ))}
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
                  className="block p-4 hover:bg-slate-50 transition-colors"
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