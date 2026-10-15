import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Wifi,
  WifiOff,
  CheckCheck,
  Trash2,
  X,
  Ticket,
  MessageSquare,
  AlertCircle,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useNotifications, type AppNotification } from '@/context/NotificationsContext';
import { useTheme } from '@/context/ThemeContext';
import logo from '@/assets/ChatGPT Image Aug 5, 2026, 11_31_31 AM.png';

interface HeaderProps {
  onMenuClick: () => void;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function notificationIcon(type: string) {
  const value = (type || '').toLowerCase();
  if (value.includes('message')) return MessageSquare;
  if (value.includes('assign') || value.includes('ticket')) return Ticket;
  if (value.includes('error') || value.includes('fail')) return AlertCircle;
  return Info;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { connected, retryCount, reconnectNow } = useSocket();
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, clearAll } =
    useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close the panel when clicking outside of it or pressing Escape.
  useEffect(() => {
    if (!bellOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBellOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [bellOpen]);

  const openNotification = (notification: AppNotification) => {
    markRead(notification.id);
    const ticketId = notification.data?.ticketId;
    if (typeof ticketId === 'string' && ticketId) {
      setBellOpen(false);
      navigate(`/tickets/${ticketId}`);
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
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
        <button
          onClick={reconnectNow}
          className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            connected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={connected ? 'Real-time connected' : retryCount > 0 ? `Real-time reconnecting (attempt ${retryCount}) — click to retry now` : 'Real-time disconnected — click to retry'}
        >
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : retryCount > 0 ? `Reconnecting… (${retryCount})` : 'Offline · Retry'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((open) => !open)}
            className="btn btn-ghost btn-sm relative"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-haspopup="true"
            aria-expanded={bellOpen}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[#ffffff] text-[10px] leading-none font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-medium text-[#ffffff] bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 whitespace-nowrap"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ticket assignments and updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = notificationIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                        className={clsx(
                          'flex gap-3 px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50',
                          !notification.read && 'bg-slate-50'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className={clsx('text-sm text-gray-900 break-words', !notification.read && 'font-semibold')}>
                              {notification.title}
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-gray-300 hover:text-red-500 flex-shrink-0 p-0.5"
                              aria-label="Dismiss notification"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {notification.message && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="w-full px-4 py-2.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 border-t border-slate-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-[#0f766e] flex items-center justify-center shadow-lg shadow-brand-500/25">
            <User className="w-5 h-5 text-[#ffffff]" />
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
