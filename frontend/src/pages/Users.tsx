import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, Eye, UserPlus, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { userApi, roleApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import type { User as UserType } from '@/types/models';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
}

export default function Users() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdminOrOwner = hasRole(['SUPER_ADMIN', 'ISP_OWNER']);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  // Fetch roles for dropdown
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.list({ limit: 100 }),
    select: (data) => data.data.data,
  });

  useEffect(() => {
    if (rolesData) setRoles(rolesData);
  }, [rolesData]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', page, limit, search, roleFilter, isActiveFilter, sortBy, sortOrder],
    queryFn: () => userApi.list({ page, limit, search, roleId: roleFilter || undefined, isActive: isActiveFilter, sortBy, sortOrder }),
    placeholderData: (previousData) => previousData,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => userApi.create(data),
    onSuccess: () => {
      toast.success('User created successfully');
      refetch();
      setFormModalOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userApi.update(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      refetch();
      setFormModalOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      toast.success('User deactivated successfully');
      refetch();
      setDeleteModalOpen(false);
      setUserToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate user');
    },
  });

  const handleFormSubmit = (formData: any) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormModalOpen(true);
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormModalOpen(true);
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row: UserType) => (
        <a href={`mailto:${row.email}`} className="text-primary-600 hover:underline text-sm">{row.email}</a>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row: UserType) => (
        <div>
          <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
          <p className="text-sm text-gray-500">{row.phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (row: UserType) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
          {row.role?.name}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (row: UserType) => (
        <StatusBadge type="custom" value={row.isActive ? 'active' : 'inactive'} label={row.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      sortable: true,
      render: (row: UserType) => (
        <span className="text-gray-900">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row: UserType) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="btn btn-ghost btn-sm"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setUserToDelete(row); setDeleteModalOpen(true); }}
            className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
            title="Deactivate"
            disabled={row.id === 'cmt43vqur0008p5v45qaesgjm'} // Prevent deleting self
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Prevent non-superadmin/owner from accessing
  if (!isSuperAdminOrOwner) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage system users and roles</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn btn-secondary gap-2', showFilters && 'bg-brand-50 text-brand-700 border-brand-200')}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Role:</label>
              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={isActiveFilter !== undefined ? String(isActiveFilter) : ''}
                onChange={e => { setIsActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(1); }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1); }}
                className="input py-1 px-2 text-sm w-auto"
              >
                <option value="createdAt">Created Date</option>
                <option value="email">Email</option>
                <option value="firstName">Name</option>
                <option value="lastLoginAt">Last Login</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="btn btn-secondary p-1.5"
                title="Toggle sort order"
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {(roleFilter || isActiveFilter !== undefined) && (
              <button
                onClick={() => { setRoleFilter(''); setIsActiveFilter(undefined); }}
                className="btn btn-secondary text-sm gap-2"
              >
                <ChevronUp className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}

        <DataTable<UserType>
          data={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No users found"
          rowKey={row => row.id}
          sortable
          defaultSortKey="createdAt"
          defaultSortOrder="desc"
          pagination={data?.data?.meta ? {
            page: data.data.meta.page,
            limit: data.data.meta.limit,
            total: data.data.meta.total,
            totalPages: data.data.meta.totalPages,
            onPageChange: (p: number) => setPage(p),
            onLimitChange: (l: number) => setLimit(l),
          } : undefined}
          searchable={false}
        />
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Deactivate User">
          <p className="text-gray-600 mb-6">
            Are you sure you want to deactivate <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> ({userToDelete?.email})?
            This will prevent them from logging in. This action can be reversed by editing the user.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={() => deleteUserMutation.mutate(userToDelete!.id)} className="btn btn-danger" disabled={deleteUserMutation.isPending}>
              {deleteUserMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        </Modal>
      )}

      {/* User Form Modal */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => { setFormModalOpen(false); setEditingUser(null); }}
          title={editingUser ? 'Edit User' : 'Add User'}
          size="lg"
        >
          <UserForm
            editingUser={editingUser}
            roles={roles}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormModalOpen(false); setEditingUser(null); }}
            isSubmitting={createUserMutation.isPending || updateUserMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

// User Form Component
interface UserFormProps {
  editingUser: UserType | null;
  roles: Role[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function UserForm({ editingUser, roles, onSubmit, onCancel, isSubmitting }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: editingUser?.email || '',
    firstName: editingUser?.firstName || '',
    lastName: editingUser?.lastName || '',
    phone: editingUser?.phone || '',
    roleId: editingUser?.role?.id || '',
    isActive: editingUser?.isActive ?? true,
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.roleId) newErrors.roleId = 'Role is required';
    if (!editingUser) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = { ...formData };
      // Always remove confirmPassword - it's only for frontend validation
      const { confirmPassword, ...dataWithoutConfirm } = submitData;
      // For editing, also remove password if not changed
      if (editingUser && !dataWithoutConfirm.password) {
        const { password, ...rest } = dataWithoutConfirm;
        onSubmit(rest);
        return;
      }
      onSubmit(dataWithoutConfirm);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={clsx('input', errors.email && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
            disabled={!!editingUser} // Email cannot be changed after creation
            required
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="label">Role</label>
          <select
            value={formData.roleId}
            onChange={e => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
            className={clsx('input', errors.roleId && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
            required
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          {errors.roleId && <p className="text-xs text-red-500 mt-1">{errors.roleId}</p>}
        </div>
        <div>
          <label className="label">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className={clsx('input', errors.firstName && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
            required
          />
          {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="label">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className={clsx('input', errors.lastName && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
            required
          />
          {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="input"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
        </div>
      </div>

      {!editingUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={clsx('input', errors.password && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
              required
              minLength={8}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={clsx('input', errors.confirmPassword && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
              required
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>
      )}

      {editingUser && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">Leave password blank to keep current password. Enter new password to change it.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">New Password (optional)</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={clsx('input', errors.password && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
                minLength={8}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={clsx('input', errors.confirmPassword && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}