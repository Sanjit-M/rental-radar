import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { PTP_COORDINATES } from '../../domain/config';

interface MapViewProps {
  listings: RentalListing[];
  onSelectListing?: (listing: RentalListing) => void;
  onStatusChange?: (id: number, status: UserListingStatus) => void;
}

export const MapView: React.FC<MapViewProps> = ({ listings, onSelectListing }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [PTP_COORDINATES.lat, PTP_COORDINATES.lon],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter Tile Layer (Clean, high performance, zero API key)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Prestige Tech Park Anchor Pin
      const ptpIcon = L.divIcon({
        className: 'ptp-office-pin',
        html: `
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            font-weight: 800;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 9999px;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.6);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            🏢 Prestige Tech Park
          </div>
        `,
        iconSize: [130, 30],
        iconAnchor: [65, 15],
      });

      L.marker([PTP_COORDINATES.lat, PTP_COORDINATES.lon], { icon: ptpIcon })
        .addTo(map)
        .bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; font-weight: 600;">
            🏢 <b>Prestige Tech Park (PTP)</b><br/>
            Kadubeesanahalli, Outer Ring Road<br/>
            <span style="color: #059669; font-size: 11px;">Primary Commute Destination Anchor</span>
          </div>
        `);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing listing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && !(layer.options.icon?.options.className === 'ptp-office-pin')) {
        map.removeLayer(layer);
      }
    });

    // Group listings by coordinates to prevent overlapping
    const coordsMap = new Map<string, RentalListing[]>();
    listings.forEach((l) => {
      const lat = l.entities.societyLat || 12.9380;
      const lon = l.entities.societyLon || 77.6925;
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (!coordsMap.has(key)) {
        coordsMap.set(key, []);
      }
      coordsMap.get(key)!.push(l);
    });

    // Add listing markers
    coordsMap.forEach((groupListings, key) => {
      const [latStr, lonStr] = key.split(',');
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const primary = groupListings[0];
      const count = groupListings.length;

      const scoreColor =
        primary.score >= 90
          ? 'linear-gradient(135deg, #10b981, #047857)'
          : primary.score >= 75
          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
          : 'linear-gradient(135deg, #f59e0b, #b45309)';

      const markerHtml = `
        <div style="
          background: ${scoreColor};
          color: white;
          font-weight: 800;
          font-family: sans-serif;
          font-size: 11px;
          padding: 3px 7px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 2px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          transition: transform 0.2s ease;
        " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
          <span>${primary.score >= 90 ? '🔥' : '✨'}</span>
          <span>${primary.score} pts</span>
          ${count > 1 ? `<span style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 6px; font-size: 9px;">+${count - 1}</span>` : ''}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'society-marker-pin',
        html: markerHtml,
        iconSize: [80, 26],
        iconAnchor: [40, 13],
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; color: #0f172a; min-width: 220px; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #0f172a;">
            ${primary.entities.societyName || primary.location}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            👤 ${primary.authorName} • 🕒 ${primary.postedTime}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span style="font-size: 15px; font-weight: 800; color: #059669;">
              ₹${primary.entities.rent ? primary.entities.rent.toLocaleString('en-IN') : 'Contact'}/mo
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #475569;">
              ⏱️ ${primary.commute.twoWayAvgPeakMins}m peak commute
            </span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
            ${primary.bhkType} • ${primary.entities.furnishing}
          </div>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            ${
              primary.entities.contactPhone
                ? `<a href="https://wa.me/91${primary.entities.contactPhone}" target="_blank" style="flex: 1; text-align: center; background: #10b981; color: white; text-decoration: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">WhatsApp</a>`
                : ''
            }
            <a href="${primary.postUrl}" target="_blank" style="flex: 1; text-align: center; background: #1e293b; color: white; text-decoration: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">View Post</a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map);
      marker.bindPopup(popupContent, { maxWidth: 280 });
      marker.on('click', () => {
        if (onSelectListing) onSelectListing(primary);
      });
    });

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings, onSelectListing]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden glass-panel border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Map Legend Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> 🔥 90+ Unicorn
        </div>
        <div className="flex items-center gap-1.5 font-medium text-blue-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> ✨ 75+ Great
        </div>
        <div className="flex items-center gap-1.5 font-medium text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> ⚡ 55+ Moderate
        </div>
      </div>
    </div>
  );
};
