import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Target, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface CoordinatePickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
  readOnly?: boolean;
}

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapInteraction({ center, onMapClick, markerPosition }: { center: [number, number]; onMapClick?: (lat: number, lng: number) => void; markerPosition: [number, number] | null }) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  // Update map view when center changes
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

export default function CoordinatePicker({ latitude, longitude, onSelect, height = '300px', readOnly = false }: CoordinatePickerProps) {
  const [center, setCenter] = useState<[number, number]>(latitude && longitude ? [latitude, longitude] : [13.0827, 80.2707]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(latitude && longitude ? [latitude, longitude] : null);
  const [zoom, setZoom] = useState(13);
  const mapRef = useRef<any>(null);

  const handleMapClick = (lat: number, lng: number) => {
    if (readOnly) return;
    setMarkerPosition([lat, lng]);
    onSelect(lat, lng);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCenter([lat, lng]);
        setMarkerPosition([lat, lng]);
        setZoom(16);
        if (!readOnly) {
          onSelect(lat, lng);
        }
      },
      (error) => {
        alert('Unable to retrieve your location: ' + error.message);
      }
    );
  };

  const handleClear = () => {
    if (readOnly) return;
    setMarkerPosition(null);
    onSelect(0, 0);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Map Controls */}
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Pick Location</span>
          {markerPosition && (
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
              {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLocateMe}
              className="btn btn-secondary text-xs gap-1 px-2 py-1"
              title="Use current location"
            >
              <Target className="w-3 h-3" />
              <span className="hidden sm:inline">Current Location</span>
            </button>
            {markerPosition && (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary text-xs gap-1 px-2 py-1 text-red-600 hover:text-red-700"
                title="Clear selection"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ height, width: '100%' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          ref={mapRef}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapInteraction
            center={center}
            onMapClick={handleMapClick}
            markerPosition={markerPosition}
          />

          {markerPosition && (
            <Marker position={markerPosition} icon={DefaultIcon}>
              <div className="text-center">
                <MapPin className="w-6 h-6 text-red-600 mx-auto" />
                <div className="text-xs text-gray-600 bg-white px-1 rounded shadow">
                  Selected Location
                </div>
              </div>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Coordinate Display */}
      <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-gray-500 block mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={markerPosition ? markerPosition[0].toFixed(6) : ''}
              readOnly
              className="input text-xs"
            />
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={markerPosition ? markerPosition[1].toFixed(6) : ''}
              readOnly
              className="input text-xs"
            />
          </div>
        </div>
        {!markerPosition && !readOnly && (
          <p className="text-xs text-gray-500 mt-2 text-center">Click on the map to select a location</p>
        )}
      </div>
    </div>
  );
}