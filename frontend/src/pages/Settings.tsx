import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  Bell,
  Shield,
  Key,
  Globe,
  Database,
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { webhookApi } from '@/api/endpoints';
import { toast } from 'sonner';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'integrations'>('profile');

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newTicketAlert: true,
    ticketAssignedAlert: true,
    renewalAlert: true,
    paymentAlert: false,
    soundEnabled: true,
  });

  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  const setupTelegramMutation = useMutation({
    mutationFn: (url: string) => webhookApi.setupTelegram(url),
    onSuccess: () => {
      toast.success('Telegram webhook configured');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to setup Telegram webhook');
    },
  });

  const tabs = [
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Integrations', icon: Globe },
  ];

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
      });
      toast.success('Profile updated successfully');
      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleTelegramSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramWebhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }
    setupTelegramMutation.mutate(telegramWebhookUrl.trim());
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
      </div>

      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-4" aria-label="Settings tabs">
            {tabs.map(tab => (
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
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={e => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={e => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="btn btn-primary"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: 'newTicketAlert', label: 'New Ticket Alerts', desc: 'Get notified when a new ticket is created' },
                  { key: 'ticketAssignedAlert', label: 'Ticket Assigned Alerts', desc: 'Get notified when a ticket is assigned to you' },
                  { key: 'renewalAlert', label: 'Renewal Alerts', desc: 'Get notified about upcoming site renewals' },
                  { key: 'paymentAlert', label: 'Payment Alerts', desc: 'Get notified about new payments' },
                  { key: 'soundEnabled', label: 'Sound Notifications', desc: 'Play sound on new alerts' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                        onChange={() => toggleNotification(item.key as keyof typeof notificationSettings)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => toast.success('Notification settings saved')} className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Telegram Integration</h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Telegram Bot</p>
                        <p className="text-sm text-gray-600">Configure webhook for ticket creation</p>
                      </div>
                    </div>
                    <span className="badge-info">Active</span>
                  </div>
                  <form onSubmit={handleTelegramSetup} className="space-y-3">
                    <div>
                      <label className="label">Webhook URL</label>
                      <input
                        type="url"
                        value={telegramWebhookUrl}
                        onChange={e => setTelegramWebhookUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/v1/webhooks/telegram"
                        className="input"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={setupTelegramMutation.isPending}
                        className="btn btn-primary"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {setupTelegramMutation.isPending ? 'Setting up...' : 'Setup Webhook'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Database & System</h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">PostgreSQL Database</p>
                        <p className="text-sm text-gray-600">Connection status</p>
                      </div>
                    </div>
                    <span className="badge-success">Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
