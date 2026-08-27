import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Site, ISP } from '@/types/models';

interface GisMapProps {
  sites: Site[];
  isps: ISP[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

const siteStatusColors: Record<string, string> = {
  FEASIBILITY_PENDING: '#f59e0b',
  SURVEY_IN_PROGRESS: '#3b82f6',
  FEASIBILITY_APPROVED: '#10b981',
  FEASIBILITY_REJECTED: '#ef4444',
  PROVISIONING: '#8b5cf6',
  DELIVERED_ACTIVE: '#22c55e',
  RENEWAL_DUE: '#f97316',
  SUSPENDED: '#6b7280',
  DISCONNECTED: '#9ca3af',
};

const siteStatusLabels: Record<string, string> = {
  FEASIBILITY_PENDING: 'Feasibility Pending',
  SURVEY_IN_PROGRESS: 'Survey in Progress',
  FEASIBILITY_APPROVED: 'Feasibility Approved',
  FEASIBILITY_REJECTED: 'Feasibility Rejected',
  PROVISIONING: 'Provisioning',
  DELIVERED_ACTIVE: 'Delivered Active',
  RENEWAL_DUE: 'Renewal Due',
  SUSPENDED: 'Suspended',
  DISCONNECTED: 'Disconnected',
};

// Fix default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const IspIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'isp-marker-icon',
});

function SiteMarker({ site, onClick }: { site: Site; onClick: (site: Site) => void }) {
  const color = siteStatusColors[site.status] || '#6b7280';
  const [isOpen, setIsOpen] = useState(false);

  const position = site.latitude && site.longitude ? [site.latitude, site.longitude] as [number, number] : null;

  if (!position) return null;

  // Use useMapEvents to handle click on CircleMarker
  const map = useMapEvents({
    click(e: L.LeafletMouseEvent) {
      // Check if click is on this marker
      const markerLatLng = L.latLng(position[0], position[1]);
      const clickLatLng = e.latlng;
      const distance = markerLatLng.distanceTo(clickLatLng);
      // If click is very close to marker (within ~20 pixels at current zoom)
      if (distance < 50) {
        onClick(site);
        setIsOpen(true);
      } else if (isOpen) {
        setIsOpen(false);
      }
    },
  });

  return (
    <>
      <CircleMarker
        center={position}
        radius={10}
        pathOptions={{
          color: '#fff',
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2,
          opacity: 1,
        }}
      />
      {isOpen && (
        <Popup
          position={position}
          autoClose={false}
          closeOnClick={false}
          closeButton={false}
        >
          <div className="p-2 min-w-[200px]">
            <h4 className="font-semibold text-gray-900 mb-1">{site.siteCode}</h4>
            <p className="text-sm text-gray-600 mb-1">{site.planName}</p>
            <p className="text-xs text-gray-500 mb-2">{site.bandwidth}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full`} style={{ backgroundColor: color + '20', color }}>
              {siteStatusLabels[site.status] || site.status}
            </span>
            <div className="mt-2 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(site);
                }}
                className="text-primary-600 text-xs hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

function IspMarker({ isp }: { isp: ISP }) {
  const position = isp.latitude && isp.longitude ? [isp.latitude, isp.longitude] as [number, number] : null;

  if (!position) return null;

  return (
    <Marker position={position} icon={IspIcon}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h4 className="font-semibold text-gray-900 mb-1">{isp.displayName || isp.name}</h4>
          {isp.address && <p className="text-sm text-gray-600 mb-1">{isp.address}</p>}
          {isp.city && isp.state && <p className="text-xs text-gray-500">{isp.city}, {isp.state}</p>}
          <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 mt-2">
            ISP POP
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({ selectedSite, onCloseDetails }: { selectedSite: Site | null; onCloseDetails: () => void }) {
  const map = useMapEvents({
    click() {
      if (selectedSite) {
        onCloseDetails();
      }
    },
  });

  return null;
}

export default function GisMap({ sites, isps, height = '600px', center = [13.0827, 80.2707], zoom = 10 }: GisMapProps) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const handleSiteClick = (site: Site) => {
    setSelectedSite(site);
  };

  const handleCloseDetails = () => {
    setSelectedSite(null);
  };

  // Calculate bounds to fit all markers
  const allPositions = [
    ...sites.filter(s => s.latitude && s.longitude).map(s => [s.latitude!, s.longitude!] as [number, number]),
    ...isps.filter(i => i.latitude && i.longitude).map(i => [i.latitude!, i.longitude!] as [number, number]),
  ];

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ISP Markers */}
        {isps.map(isp => (
          <IspMarker key={isp.id} isp={isp} />
        ))}

        {/* Site Markers */}
        {sites.map(site => (
          <SiteMarker key={site.id} site={site} onClick={handleSiteClick} />
        ))}

        <MapController selectedSite={selectedSite} onCloseDetails={handleCloseDetails} />
      </MapContainer>

      {/* Site Details Panel */}
      {selectedSite && (
        <div className="fixed bottom-4 right-4 lg:relative lg:fixed lg:bottom-auto lg:right-auto lg:top-4 lg:left-4 max-w-md bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-slide-up">
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedSite.siteCode}</h3>
              <p className="text-sm text-gray-500">{selectedSite.planName}</p>
            </div>
            <button
              onClick={handleCloseDetails}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <span
                  className="inline-block px-2 py-1 text-xs rounded-full font-medium"
                  style={{ backgroundColor: (siteStatusColors[selectedSite.status] || '#6b7280') + '20', color: siteStatusColors[selectedSite.status] || '#6b7280' }}
                >
                  {siteStatusLabels[selectedSite.status] || selectedSite.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Bandwidth</p>
                <p className="font-medium text-gray-900">{selectedSite.bandwidth}</p>
              </div>
              <div>
                <p className="text-gray-500">Connection</p>
                <p className="font-medium text-gray-900">{selectedSite.connectionType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">ISP</p>
                <p className="font-medium text-gray-900 truncate">{selectedSite.isp?.displayName || selectedSite.isp?.name || 'N/A'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-500 text-sm">Customer</p>
              <p className="font-medium text-gray-900">{selectedSite.customer?.companyName}</p>
              <p className="text-sm text-gray-600">{selectedSite.customer?.contactPerson}</p>
              <p className="text-sm text-gray-600">{selectedSite.customer?.phone}</p>
              <p className="text-sm text-gray-600">{selectedSite.installationAddress}</p>
              <p className="text-sm text-gray-600">{selectedSite.installationCity}, {selectedSite.installationState}</p>
            </div>

            <div className="pt-2 border-t border-gray-200 flex gap-2">
              <button className="btn btn-primary flex-1 text-sm">View Details</button>
              <button className="btn btn-secondary flex-1 text-sm">Create Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}