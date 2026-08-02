import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Building, ArrowUpRight, CheckCircle2, Maximize2 } from 'lucide-react';
import DealBadge from './DealBadge';
import 'leaflet/dist/leaflet.css';

/* 
 * NOTE FOR PHASE 7+:
 * OpenStreetMap (OSM) public tile servers (https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png)
 * are used here for development and initial release. High-volume production traffic requires
 * a paid tile provider (MapTiler, Stadia Maps, Mapbox) or a caching proxy in front of OSM tile server.
 */

// Fix standard Leaflet default icon paths in React Vite build
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker HTML builder
const createCustomMarker = (dealTag, priceStr, isSelected) => {
  let badgeColor = '#12283C';
  if (dealTag === 'Good Deal' || dealTag === 'Underpriced') badgeColor = '#1F7A6C';
  if (dealTag === 'Overpriced') badgeColor = '#C85A32';

  const svgHtml = `
    <div style="
      background-color: ${isSelected ? '#B98B4E' : badgeColor};
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid white;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
      transition: transform 0.2s ease;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-10a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>${priceStr || dealTag || 'Property'}</span>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [110, 32],
    iconAnchor: [55, 16],
  });
};

// City Center Lat/Lng Coordinates for the 5 ML-trained Metros
const CITY_CENTERS = {
  'Delhi NCR': { lat: 28.6139, lng: 77.2090, zoom: 11 },
  'Mumbai': { lat: 19.0760, lng: 72.8777, zoom: 11 },
  'Bangalore': { lat: 12.9716, lng: 77.5946, zoom: 11 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867, zoom: 11 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714, zoom: 12 },
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629, zoom: 5 };

// Map Bounds Auto-Fit Helper Component
function MapRecenter({ selectedCity, properties, selectedPropertyId }) {
  const map = useMap();

  useEffect(() => {
    if (selectedPropertyId) {
      const prop = properties.find((p) => p.id === selectedPropertyId);
      if (prop && prop.latitude != null && prop.longitude != null) {
        map.flyTo([Number(prop.latitude), Number(prop.longitude)], 14, { duration: 1.2 });
        return;
      }
    }

    const validProps = properties.filter(
      (p) => p.latitude != null && p.longitude != null && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
    );

    if (validProps.length > 0) {
      const bounds = L.latLngBounds(validProps.map((p) => [Number(p.latitude), Number(p.longitude)]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (selectedCity && CITY_CENTERS[selectedCity]) {
      const center = CITY_CENTERS[selectedCity];
      map.flyTo([center.lat, center.lng], center.zoom, { duration: 1.2 });
    }
  }, [selectedCity, selectedPropertyId, properties, map]);

  return null;
}

const formatPriceINR = (price) => {
  if (!price) return '₹ N/A';
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  }
  return `₹${(price / 100000).toFixed(2)} Lakh`;
};

const formatPricePerSqft = (price, sqft) => {
  if (!price || !sqft || sqft <= 0) return null;
  const psf = Math.round(price / sqft);
  return `₹${psf.toLocaleString('en-IN')}/sqft`;
};

export default function PropertyMap({
  properties = [],
  selectedCity = '',
  selectedPropertyId = null,
  onMarkerClick = null,
  height = '500px',
}) {
  const centerConfig = selectedCity && CITY_CENTERS[selectedCity]
    ? CITY_CENTERS[selectedCity]
    : DEFAULT_CENTER;

  // Handle properties with null lat/lng gracefully
  const validProperties = properties.filter(
    (p) => p.latitude != null && p.longitude != null && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
  );

  const defaultImage = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-[#12283C]/10 bg-white" style={{ height }}>
      {/* Map Header Overlay Tag */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-[#12283C]/10 flex items-center gap-2 text-xs font-semibold text-[#12283C]">
        <Sparkles className="w-3.5 h-3.5 text-[#B98B4E]" />
        GIS Spatial Map ({validProperties.length} Pinned of {properties.length} Total)
      </div>

      <MapContainer
        center={[centerConfig.lat, centerConfig.lng]}
        zoom={centerConfig.zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter
          selectedCity={selectedCity}
          properties={validProperties}
          selectedPropertyId={selectedPropertyId}
        />

        {validProperties.map((prop) => {
          const isSelected = selectedPropertyId === prop.id;
          const lat = Number(prop.latitude);
          const lng = Number(prop.longitude);
          const displayImage = (prop.images && prop.images.length > 0)
            ? prop.images[0]
            : (prop.gallery && prop.gallery.length > 0 ? prop.gallery[0].image : defaultImage);
          const priceStr = formatPriceINR(prop.listed_price);
          const psfStr = formatPricePerSqft(prop.listed_price, prop.area_sqft);

          return (
            <Marker
              key={prop.id}
              position={[lat, lng]}
              icon={createCustomMarker(prop.deal_tag, priceStr, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(prop.id);
                },
              }}
            >
              <Popup className="estateiq-map-popup">
                <div className="p-1.5 max-w-[240px]">
                  {/* Thumbnail Image */}
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg mb-2 bg-[#12283C]">
                    <img
                      src={displayImage}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = defaultImage; }}
                    />
                    {/* Property Type Badge */}
                    <span className="absolute bottom-2 left-2 bg-[#12283C]/80 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      {prop.property_type}
                    </span>
                  </div>

                  {/* Title & Locality */}
                  <div className="text-xs font-bold text-[#12283C] line-clamp-1 mb-0.5">
                    {prop.title}
                  </div>
                  <div className="flex items-center text-[11px] text-[#5C6B73] mb-2 gap-1">
                    <MapPin className="w-3 h-3 text-[#B98B4E] shrink-0" />
                    <span className="truncate">{prop.locality}, {prop.city}</span>
                  </div>

                  {/* BHK + Area sqft */}
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[#12283C] bg-[#F7F5F0] px-2 py-1 rounded-md mb-2">
                    <span className="font-bold">{prop.bhk} BHK</span>
                    <span className="text-[#5C6B73]">•</span>
                    <span className="font-mono text-[10px]">{prop.area_sqft} sqft</span>
                    {psfStr && (
                      <>
                        <span className="text-[#5C6B73]">•</span>
                        <span className="text-[10px] text-[#1F7A6C] font-semibold">{psfStr}</span>
                      </>
                    )}
                  </div>

                  {/* Badges: RERA + ML Deal Tag */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {prop.rera_approved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1F7A6C]/15 text-[#155E52] border border-[#1F7A6C]/30">
                        <CheckCircle2 className="w-3 h-3 text-[#1F7A6C]" /> RERA
                      </span>
                    )}
                    {prop.deal_tag && (
                      <DealBadge dealTag={prop.deal_tag} />
                    )}
                  </div>

                  {/* Price & ML Valuation */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-[#5C6B73] block uppercase tracking-wider font-semibold">Asking Price</span>
                      <span className="font-mono text-xs font-bold text-[#12283C]">
                        {priceStr}
                      </span>
                    </div>

                    {prop.predicted_price && (
                      <div className="text-right">
                        <span className="text-[9px] text-[#1F7A6C] block uppercase tracking-wider font-bold">ML Valuation</span>
                        <span className="font-mono text-xs font-semibold text-[#1F7A6C]">
                          {formatPriceINR(prop.predicted_price)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Link */}
                  <Link
                    to={`/properties/${prop.id}`}
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1 text-xs font-bold bg-[#12283C] text-white py-1.5 rounded-lg hover:bg-[#B98B4E] transition-colors shadow-sm"
                  >
                    View Details <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
