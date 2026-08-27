import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wifi,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { clsx } from 'clsx';
import { gisApi, ispApi } from '@/api/endpoints';
import GisMap from '@/components/map/GisMap';
import type { Site, ISP } from '@/types/models';
import { SiteStatus } from '@/types/enums';
import { toast } from 'sonner';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: SiteStatus.FEASIBILITY_PENDING, label: 'Feasibility Pending' },
  { value: SiteStatus.SURVEY_IN_PROGRESS, label: 'Survey in Progress' },
  { value: SiteStatus.FEASIBILITY_APPROVED, label: 'Feasibility Approved' },
  { value: SiteStatus.FEASIBILITY_REJECTED, label: 'Feasibility Rejected' },
  { value: SiteStatus.PROVISIONING, label: 'Provisioning' },
  { value: SiteStatus.DELIVERED_ACTIVE, label: 'Delivered Active' },
  { value: SiteStatus.RENEWAL_DUE, label: 'Renewal Due' },
  { value: SiteStatus.SUSPENDED, label: 'Suspended' },
  { value: SiteStatus.DISCONNECTED, label: 'Disconnected' },
];

const connectionTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Fiber', label: 'Fiber' },
  { value: 'Leased Line', label: 'Leased Line' },
  { value: 'Wireless', label: 'Wireless' },
  { value: 'DSL', label: 'DSL' },
  { value: 'Cable', label: 'Cable' },
];

export default function GisMapPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [connectionTypeFilter, setConnectionTypeFilter] = useState('');
  const [ispFilter, setIspFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0827, 80.2707]);
  const [mapZoom, setMapZoom] = useState(10);

  const { data: sitesData, isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ['gis-sites', statusFilter, connectionTypeFilter, ispFilter],
    queryFn: () => gisApi.listSites({
      limit: 1000,
      status: statusFilter || undefined,
      connectionType: connectionTypeFilter || undefined,
      ispId: ispFilter || undefined,
    }),
  });

  const { data: ispsData, isLoading: ispsLoading, refetch: refetchIsps } = useQuery({
    queryKey: ['gis-isps'],
    queryFn: () => gisApi.listIsps({ limit: 1000 }),
  });

  const sites: Site[] = sitesData?.data?.data || [];
  const isps: ISP[] = ispsData?.data?.data || [];

  const handleRefresh = () => {
    refetchSites();
    refetchIsps();
    toast.success('Map data refreshed');
  };

  // Calculate map bounds to fit all markers
  const allPositions = [
    ...sites.filter(s => s.latitude && s.longitude).map(s => [s.latitude!, s.longitude!] as [number, number]),
    ...isps.filter(i => i.latitude && i.longitude).map(i => [i.latitude!, i.longitude!] as [number, number]),
  ];

  // Auto-fit bounds if we have markers
  useEffect(() => {
    if (allPositions.length > 0) {
      // We could auto-fit here, but let's keep manual control
    }
  }, [allPositions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GIS Map</h1>
          <p className="text-gray-600 mt-1">View sites and ISP POPs on map</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={sitesLoading || ispsLoading}
            className="btn btn-secondary gap-2"
          >
            <RefreshCw className={clsx('w-4 h-4', (sitesLoading || ispsLoading) && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Filters
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden btn btn-secondary text-sm gap-1"
              >
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <div className={clsx('transition-all duration-200', showFilters && 'block', 'lg:block')} style={{ display: showFilters || window.innerWidth >= 1024 ? 'block' : 'none' }}>
              <div className="p-4 space-y-4">
                <div>
                  <label className="label">Site Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="input"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Connection Type</label>
                  <select
                    value={connectionTypeFilter}
                    onChange={e => setConnectionTypeFilter(e.target.value)}
                    className="input"
                  >
                    {connectionTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">ISP</label>
                  <select
                    value={ispFilter}
                    onChange={e => setIspFilter(e.target.value)}
                    className="input"
                  >
                    <option value="">All ISPs</option>
                    {isps.map(isp => (
                      <option key={isp.id} value={isp.id}>{isp.displayName || isp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Map Controls</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Click site markers for details</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-gray-500">Purple markers = ISP POPs</span>
                    </div>
                  </div>
                </div>

                {(statusFilter || connectionTypeFilter || ispFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setConnectionTypeFilter('');
                      setIspFilter('');
                    }}
                    className="btn btn-secondary w-full text-sm gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card mt-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sites</span>
                <span className="font-medium text-gray-900">{sites.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total ISPs</span>
                <span className="font-medium text-gray-900">{isps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sites with Coordinates</span>
                <span className="font-medium text-gray-900">
                  {sites.filter(s => s.latitude && s.longitude).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ISPs with Coordinates</span>
                <span className="font-medium text-gray-900">
                  {isps.filter(i => i.latitude && i.longitude).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="card h-[calc(100vh-280px)] min-h-[500px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Map View
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Center: {mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}</span>
                <span>Zoom: {mapZoom}</span>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              {sitesLoading || ispsLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
                </div>
              ) : (
                <GisMap
                  sites={sites}
                  isps={isps}
                  height="100%"
                  center={mapCenter}
                  zoom={mapZoom}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}