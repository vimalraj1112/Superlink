import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Wifi,
  TicketCheck,
  Settings,
  CreditCard,
  FileText,
  Map,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'FINANCE', 'SUPPORT'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'SUPPORT', 'FINANCE'] },
  { name: 'Sites', href: '/sites', icon: MapPin, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'SUPPORT'] },
  { name: 'Tickets', href: '/tickets', icon: TicketCheck, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES', 'NOC', 'FINANCE', 'SUPPORT'] },
];

const moreNav = [
  { name: 'ISPs', href: '/isps', icon: Wifi, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'NOC'] },
  { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'FINANCE'] },
  { name: 'Quotations', href: '/quotations', icon: FileText, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'SALES'] },
  { name: 'GIS Map', href: '/gis', icon: Map, roles: ['SUPER_ADMIN', 'ISP_OWNER', 'NOC'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ISP_OWNER'] },
];

export default function BottomNav() {
  const location = useLocation();
  const { hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filteredMain = mainNav.filter(item => item.roles.some(role => hasRole(role)));
  const filteredMore = moreNav.filter(item => item.roles.some(role => hasRole(role)));

  const showMore = filteredMore.length > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40" aria-label="Mobile bottom navigation">
      <div className="flex justify-around">
        {filteredMain.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-500'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {showMore && (
          <div className="relative flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors',
                isOpen ? 'text-primary-600' : 'text-gray-500'
              )}
              aria-expanded={isOpen}
              aria-label="Toggle more navigation menu"
            >
              <MoreHorizontal className="w-6 h-6" aria-hidden="true" />
              <span>More</span>
            </button>

            {/* Backdrop overlay to close menu */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/10"
                onClick={() => setIsOpen(false)}
              />
            )}

            {isOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[160px]">
                  {filteredMore.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}