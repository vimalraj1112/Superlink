import { Menu, Bell, Search, LogOut, User, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import logo from '@/assets/ChatGPT Image Aug 5, 2026, 11_31_31 AM.png';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden btn btn-ghost btn-sm"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link to="/dashboard" className="btn btn-ghost btn-sm flex items-center gap-2 lg:gap-3" aria-label="SuperLink Dashboard">
          <img src={logo} alt="SuperLink" className="w-8 h-8" />
          <span className="hidden sm:block font-bold text-gray-900 text-lg tracking-tight bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
            SuperLink
          </span>
        </Link>

        {/* Search removed per user request */}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            connected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          }`}
          title={connected ? 'Real-time connected' : 'Real-time disconnected'}
        >
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : 'Offline'}
        </div>

        <button className="btn btn-ghost btn-sm relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-brand-600 font-medium capitalize">{user?.role?.name}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}