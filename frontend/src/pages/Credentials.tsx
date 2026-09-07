import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Key, Eye, EyeOff, Copy, Trash2, Pencil, Loader2, ArrowRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { credentialsApi, siteApi } from '@/api/endpoints';
import DataTable from '@/components/common/DataTable';
import Modal from '@/components/common/Modal';
import SearchableSelect from '@/components/common/SearchableSelect';
import type { Site } from '@/types/models';
import { toast } from 'sonner';

interface CredentialRow {
  id: string;
  siteId: string;
  siteCode: string;
  customerName: string;
  customerCode: string;
  username?: string;
  routerIp?: string;
  routerModel?: string;
  vlanId?: string;
  pppoeUsername?: string;
  hasPassword: boolean;
  hasPppoePassword: boolean;
  updatedAt: string;
}

interface CredentialFormState {
  siteId: string;
  username: string;
  password: string;
  routerIp: string;
  routerModel: string;
  vlanId: string;
  pppoeUsername: string;
  pppoePassword: string;
  staticIps: string;
  notes: string;
}

const emptyForm: CredentialFormState = {
  siteId: '',
  username: '',
  password: '',
  routerIp: '',
  routerModel: '',
  vlanId: '',
  pppoeUsername: '',
  pppoePassword: '',
  staticIps: '',
  notes: '',
};

export default function Credentials() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CredentialRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialRow | null>(null);
  const [form, setForm] = useState<CredentialFormState>(emptyForm);
  const [formError, setFormError] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['credentials', page, limit, search],
    queryFn: () => credentialsApi.listAll({ page, limit, search: search || undefined }),
    placeholderData: previousData => previousData,
  });

  const { data: sitesData } = useQuery({
    queryKey: ['credentials-sites'],
    queryFn: () => siteApi.list({ limit: 1000 }),
  });

  const rows: CredentialRow[] = data?.data?.data || [];

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: CredentialRow) => {
    setEditing(row);
    setForm({
      siteId: row.siteId,
      username: row.username || '',
      password: '',
      routerIp: row.routerIp || '',
      routerModel: row.routerModel || '',
      vlanId: row.vlanId || '',
      pppoeUsername: row.pppoeUsername || '',
      pppoePassword: '',
      staticIps: '',
      notes: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: ({ siteId, data }: { siteId: string; data: any }) =>
      credentialsApi.createOrUpdate(siteId, data),
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success(editing ? 'Credentials updated' : 'Credentials saved');
        queryClient.invalidateQueries({ queryKey: ['credentials'] });
        setModalOpen(false);
      } else {
        toast.error(res.data.message || 'Failed to save credentials');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save credentials');
    },
  });

  const revealMutation = useMutation({
    mutationFn: ({ siteId, field }: { siteId: string; field: 'password' | 'pppoePassword' }) =>
      credentialsApi.reveal(siteId, field),
    onSuccess: (res, variables) => {
      const value = res.data?.data?.value;
      if (value) {
        setRevealed(prev => ({ ...prev, [`${variables.siteId}:${variables.field}`]: value }));
      } else {
        toast.error(res.data?.message || 'Failed to reveal credential');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reveal credential');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (siteId: string) => credentialsApi.delete(siteId),
    onSuccess: () => {
      toast.success('Credentials deleted');
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setRevealed({});
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete credentials');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siteId) {
      setFormError('Please select a site');
      return;
    }

    const staticIps = form.staticIps
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(ip => ({ ip }));

    const payload = {
      username: form.username || undefined,
      password: form.password || undefined,
      routerIp: form.routerIp || undefined,
      routerModel: form.routerModel || undefined,
      vlanId: form.vlanId || undefined,
      pppoeUsername: form.pppoeUsername || undefined,
      pppoePassword: form.pppoePassword || undefined,
      staticIps: staticIps.length ? staticIps : undefined,
      notes: form.notes || undefined,
    };

    saveMutation.mutate({ siteId: form.siteId, data: payload });
  };

  const renderSecretCell = (
    row: CredentialRow,
    field: 'password' | 'pppoePassword',
    label: string,
    hasValue: boolean
  ) => {
    if (!hasValue) return <span className="text-gray-400">—</span>;
    const key = `${row.siteId}:${field}`;
    const value = revealed[key];
    return (
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm text-gray-900 flex-1 truncate" style={{ maxWidth: '7rem' }}>
          {value ? value : '••••••••'}
        </span>
        {value ? (
          <>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(value);
                toast.success(`${label} copied`);
              }}
              className="btn btn-ghost btn-sm p-1"
              title={`Copy ${label}`}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRevealed(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
              })}
              className="btn btn-ghost btn-sm p-1"
              title="Hide"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => revealMutation.mutate({ siteId: row.siteId, field })}
            disabled={revealMutation.isPending}
            className="btn btn-ghost btn-sm p-1"
            title={`Reveal ${label}`}
          >
            {revealMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  };

  const columns = [
    {
      key: 'siteCode' as const,
      header: 'Site Code',
      render: (row: CredentialRow) => (
        <span className="font-mono text-sm text-brand-600">{row.siteCode}</span>
      ),
    },
    {
      key: 'customerName' as const,
      header: 'Customer',
      render: (row: CredentialRow) => (
        <div>
          <p className="font-medium text-gray-900">{row.customerName || '-'}</p>
          {row.customerCode && <p className="text-sm text-gray-500">{row.customerCode}</p>}
        </div>
      ),
    },
    {
      key: 'username' as const,
      header: 'Username',
      render: (row: CredentialRow) => (
        <span className="font-mono text-sm">{row.username || '-'}</span>
      ),
    },
    {
      key: 'routerIp' as const,
      header: 'Router',
      render: (row: CredentialRow) => {
        const ip = row.routerIp || '';
        const model = row.routerModel || '';
        if (!ip && !model) return <span className="text-gray-400">—</span>;
        return <span className="text-sm">{ip}{ip && model ? ' · ' : ''}{model}</span>;
      },
    },
    {
      key: 'vlanId' as const,
      header: 'VLAN',
      render: (row: CredentialRow) => <span className="font-mono text-sm">{row.vlanId || '-'}</span>,
    },
    {
      key: 'pppoeUsername' as const,
      header: 'PPPoE User',
      render: (row: CredentialRow) => (
        <span className="font-mono text-sm">{row.pppoeUsername || '-'}</span>
      ),
    },
    {
      key: 'hasPassword' as const,
      header: 'Password',
      render: (row: CredentialRow) => renderSecretCell(row, 'password', 'password', row.hasPassword),
    },
    {
      key: 'hasPppoePassword' as const,
      header: 'PPPoE Pwd',
      render: (row: CredentialRow) => renderSecretCell(row, 'pppoePassword', 'PPPoE password', row.hasPppoePassword),
    },
    {
      key: 'updatedAt' as const,
      header: 'Updated',
      render: (row: CredentialRow) => (
        <span className="text-sm text-gray-600">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}</span>
      ),
    },
    {
      key: 'actions' as const,
      header: 'Actions',
      className: 'text-right',
      render: (row: CredentialRow) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/sites/${row.siteId}`)} className="btn btn-ghost btn-sm p-1" title="View Site">
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(row)} className="btn btn-ghost btn-sm p-1" title="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="btn btn-ghost btn-sm p-1 text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // When adding, only offer sites that don't already have credentials
  const usedSiteIds = new Set(rows.map(r => r.siteId));
  const allSites = sitesData?.data?.data || [];
  const siteOptions = allSites
    .map((s: Site) => ({
      site: s,
      label: `${s.siteCode} — ${(s.customer as any)?.companyName || ''}`.trim(),
    }))
    .filter((o: any) => (editing ? o.site.id === form.siteId : !usedSiteIds.has(o.site.id)))
    .map((o: any) => ({ value: o.site.id, label: o.label }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
            <p className="text-gray-600 mt-1">Router and PPPoE credentials for sites</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Credentials
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by site, customer, username or IP..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
          </div>
        </div>

        <DataTable<CredentialRow>
          data={rows}
          columns={columns}
          loading={isLoading}
          emptyMessage="No credentials found"
          rowKey={row => row.id}
          sortable={false}
          pagination={data?.data?.meta ? {
            page: data.data.meta.page,
            limit: data.data.meta.limit,
            total: data.data.meta.totalItems,
            totalPages: data.data.meta.totalPages,
            onPageChange: (p: number) => setPage(p),
            onLimitChange: (l: number) => setLimit(l),
          } : undefined}
          searchable={false}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Credentials — ${editing.siteCode}` : 'Add Credentials'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
            <SearchableSelect
              label="Site"
              value={form.siteId}
              onChange={value => setForm(prev => ({ ...prev, siteId: value }))}
              options={siteOptions}
              placeholder="Select a site"
              error={formError}
              required
              disabled={!!editing}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Router Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                  className="input"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label">{editing ? 'Router Password (leave blank to keep)' : 'Router Password'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">Router IP</label>
                <input
                  type="text"
                  value={form.routerIp}
                  onChange={e => setForm(prev => ({ ...prev, routerIp: e.target.value }))}
                  className="input"
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <label className="label">Router Model</label>
                <input
                  type="text"
                  value={form.routerModel}
                  onChange={e => setForm(prev => ({ ...prev, routerModel: e.target.value }))}
                  className="input"
                  placeholder="MikroTik hEX"
                />
              </div>
              <div>
                <label className="label">VLAN ID</label>
                <input
                  type="text"
                  value={form.vlanId}
                  onChange={e => setForm(prev => ({ ...prev, vlanId: e.target.value }))}
                  className="input"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="label">PPPoE Username</label>
                <input
                  type="text"
                  value={form.pppoeUsername}
                  onChange={e => setForm(prev => ({ ...prev, pppoeUsername: e.target.value }))}
                  className="input"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label">{editing ? 'PPPoE Password (leave blank to keep)' : 'PPPoE Password'}</label>
                <input
                  type="password"
                  value={form.pppoePassword}
                  onChange={e => setForm(prev => ({ ...prev, pppoePassword: e.target.value }))}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="label">Static IPs <span className="text-gray-400 font-normal">(one IP per line)</span></label>
              <textarea
                value={form.staticIps}
                onChange={e => setForm(prev => ({ ...prev, staticIps: e.target.value }))}
                className="input"
                rows={3}
                placeholder={'103.72.210.10\n103.72.210.11'}
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Any notes about this connection..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Save Credentials'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Credentials">
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete credentials for <strong>{deleteTarget?.siteCode}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.siteId)}
            disabled={deleteMutation.isPending}
            className="btn btn-danger"
          >
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}