import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit, MapPin, Mail, Phone, Globe, Building2, ArrowLeft, Wifi, ChevronRight } from 'lucide-react';
import { ispApi, siteApi } from '@/api/endpoints';
import { toast } from 'sonner';
import type { ISP, Site } from '@/types/models';
import StatusBadge from '@/components/common/StatusBadge';
import IspForm from '@/components/forms/IspForm';

export default function IspDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'sites'>('overview');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIsp, setEditingIsp] = useState<ISP | null>(null);

  const closeIspForm = () => {
    setFormModalOpen(false);
    setEditingIsp(null);
    refetchIsp();
  };

  const { data: ispData, isLoading: ispLoading, error: ispError, refetch: refetchIsp } = useQuery({
    queryKey: ['isp', id],
    queryFn: () => ispApi.get(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: sitesData, isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ['isp-sites', id],
    queryFn: () => siteApi.list({ ispId: id!, limit: 100 }),
    enabled: !!id,
  });

  const isp: ISP | undefined = ispData?.data?.data;
  const sites: Site[] = sitesData?.data?.data || [];

  useEffect(() => {
    if (ispError) {
      toast.error('ISP not found');
      navigate('/isps');
    }
  }, [ispError, navigate]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this ISP? This action cannot be undone.')) return;
    try {
      await ispApi.delete(id);
      toast.success('ISP deleted successfully');
      navigate('/isps');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete ISP';
      toast.error(message);
    }
  };

  if (ispLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isp) return null;

  const overviewContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Person</h3>
          <p className="text-lg font-medium text-gray-900">{isp.contactPerson || 'Not specified'}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
          <p className="text-lg font-medium text-gray-900">
            {isp.email ? (
              <a href={`mailto:${isp.email}`} className="text-brand-600 hover:underline">{isp.email}</a>
            ) : 'Not specified'}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
          <p className="text-lg font-medium text-gray-900">
            {isp.phone ? (
              <a href={`tel:${isp.phone}`} className="text-brand-600 hover:underline">{isp.phone}</a>
            ) : 'Not specified'}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Website</h3>
          <p className="text-lg font-medium text-gray-900">
            {isp.website ? (
              <a href={isp.website.startsWith('http') ? isp.website : `https://${isp.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{isp.website}</a>
            ) : 'Not specified'}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">City / State</h3>
          <p className="text-lg font-medium text-gray-900">
            {isp.city || ''} {isp.city && isp.state ? ', ' : ''} {isp.state || ''}
            {(!isp.city && !isp.state) && 'Not specified'}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Coordinates</h3>
          <p className="text-lg font-medium text-gray-900">
            {isp.latitude && isp.longitude ? (
              <>
                {isp.latitude.toFixed(6)}, {isp.longitude.toFixed(6)}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${isp.latitude},${isp.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-brand-600 hover:underline"
                  title="Open in Google Maps"
                >
                  <MapPin className="w-4 h-4 inline" />
                </a>
              </>
            ) : 'Not specified'}
          </p>
        </div>
      </div>

      {(isp.address || isp.notes) && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
          </div>
          <div className="p-6 space-y-4">
            {isp.address && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
                <p className="text-gray-900">{isp.address}</p>
              </div>
            )}
            {isp.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
                <p className="text-gray-900">{isp.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const sitesContent = (
    <div className="space-y-4">
      {sitesLoading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mx-auto mb-2" />
          <p className="text-gray-500">Loading sites...</p>
        </div>
      ) : sites.length === 0 ? (
        <div className="card p-12 text-center">
          <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
          <p className="text-gray-500 mb-4">No sites are associated with this ISP yet.</p>
          <Link to="/sites/new" className="btn btn-primary inline-flex">
            <MapPin className="w-4 h-4 mr-2" />
            Add First Site
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bandwidth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map(site => (
                  <tr key={site.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/sites/${site.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{site.siteCode}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{site.customer?.companyName || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{site.planName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{site.bandwidth}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type="custom" value={site.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 truncate max-w-xs">
                        {site.installationCity}, {site.installationState}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/sites/${site.id}`}
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        View
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/isps')}
            className="btn btn-ghost btn-sm lg:hidden"
            aria-label="Back to ISPs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25 flex-shrink-0">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isp.displayName || isp.name}</h1>
            <p className="text-gray-500 mt-1">{isp.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <button onClick={() => { setEditingIsp(isp); setFormModalOpen(true); }} className="btn btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <StatusBadge type="custom" value={isp.isActive ? 'active' : 'inactive'} label={isp.isActive ? 'Active' : 'Inactive'} className="badge-lg" />
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sites')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sites'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sites ({sites.length})
            </button>
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'overview' ? overviewContent : sitesContent}
        </div>
      </div>

      <IspForm isOpen={formModalOpen} onClose={closeIspForm} initialData={editingIsp} />
    </div>
  );
}