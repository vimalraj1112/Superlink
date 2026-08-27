import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: {
    id: string;
    name: string;
    description?: string;
    permissions: Record<string, string[]>;
  };
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; phone?: string }) => authApi.updateProfile(data),
    onSuccess: (response) => {
      toast.success('Profile updated successfully');
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const profileUser = user as unknown as UserProfile;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Profile tabs">
          <button
            onClick={() => setActiveTab('profile')}
            className={clsx(
              'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={clsx(
              'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'security'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Security
          </button>
        </nav>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card p-6 text-center">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{`${profileUser?.firstName || ''} ${profileUser?.lastName || ''}`.trim() || 'User'}</h2>
              <p className="text-gray-500 mt-1">{profileUser?.email}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="badge-primary text-sm px-3 py-1 capitalize">
                  {profileUser?.role?.name}
                </span>
                <span className={clsx(
                  'badge text-sm px-3 py-1',
                  profileUser?.isActive ? 'badge-success' : 'badge-danger'
                )}>
                  {profileUser?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Member since</span>
                  <span className="font-medium text-gray-900">
                    {profileUser?.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Last login</span>
                  <span className="font-medium text-gray-900">
                    {profileUser?.lastLoginAt ? new Date(profileUser.lastLoginAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="label">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="label">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      className="input bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="label">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="input"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="label">Role</label>
                    <input
                      id="role"
                      type="text"
                      value={profileUser?.role?.name}
                      className="input bg-gray-50"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary gap-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="label">Current Password</label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="newPassword" className="label">New Password</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="input pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="btn btn-primary gap-2"
                  disabled={changePasswordMutation.isPending}
                >
                  <Lock className="w-4 h-4" />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Info */}
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="btn btn-secondary text-sm">Enable</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Active Sessions</p>
                    <p className="text-sm text-gray-500">1 active session (this device)</p>
                  </div>
                </div>
                <button className="btn btn-secondary text-sm">Manage</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}