import { Link, useLocation, NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Wifi,
  TicketCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Map,
  UploadCloud,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/ChatGPT Image Aug 5, 2026, 11_31_31 AM.png';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'FINANCE', 'SUPPORT', 'CLIENT'] },
    ],
  },
  {
    title: 'Customer Management',
    items: [
      { name: 'Customers', href: '/customers', icon: Users, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'SUPPORT', 'FINANCE'] },
      { name: 'Sites', href: '/sites', icon: MapPin, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'SUPPORT', 'CLIENT'] },
      { name: 'ISPs', href: '/isps', icon: Wifi, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'NOC'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Tickets', href: '/tickets', icon: TicketCheck, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'FINANCE', 'SUPPORT', 'CLIENT'] },
      { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'FINANCE', 'CLIENT'] },
      { name: 'Quotations', href: '/quotations', icon: FileText, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES'] },
    ],
  },
  {
    title: 'Data Management',
    items: [
      { name: 'Import / Export', href: '/import-export', icon: UploadCloud, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'FINANCE'] },
    ],
  },
  {
    title: 'Analytics & Maps',
    items: [
      { name: 'GIS Map', href: '/gis', icon: Map, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'NOC', 'CLIENT'] },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile', href: '/profile', icon: User, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'FINANCE', 'SUPPORT', 'CLIENT'] },
      { name: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ISP_OWNER'] },
      { name: 'Users', href: '/users', icon: Users, roles: ['SUPER_ADMIN', 'ISP_OWNER'] },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const location = useLocation();
  const { hasRole } = useAuth();

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen overflow-hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarWidth
        )}
        aria-label="Main navigation"
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <Link to="/dashboard" className="btn btn-ghost btn-sm flex items-center gap-3" aria-label="SuperLink Dashboard">
              <img src={logo} alt="SuperLink" className="w-8 h-8 flex-shrink-0" />
              <span className="font-bold text-gray-900 text-lg tracking-tight bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
                SuperLink
              </span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" className="btn btn-ghost btn-sm flex justify-center" title="SuperLink CRM" aria-label="SuperLink Dashboard">
              <img src={logo} alt="SuperLink" className="w-8 h-8" />
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'btn btn-ghost btn-sm',
              !collapsed && 'lg:hidden'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin" aria-label="Main menu" style={{ maxHeight: 'calc(100vh - 5.5rem)' }}>
          {navigationSections.map((section) => {
            // Filter items by role
            const filteredItems = section.items.filter(item =>
              item.roles.some(role => hasRole(role))
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {!collapsed && (
                  <h3 className="px-3 py-1.5 text-xs font-semibold text-brand-600 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                {filteredItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        collapsed && 'justify-center'
                      )}
                      title={collapsed ? item.name : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      {!collapsed && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {!collapsed && (
            <div className="text-xs text-center text-gray-500">
              SuperLink CRM v1.0.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
}