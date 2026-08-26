import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { PTP_COORDINATES, KNOWN_SOCIETIES } from '../../domain/config';

interface MapViewProps {
  listings: RentalListing[];
  onSelectListing?: (listing: RentalListing) => void;
  onStatusChange?: (id: number, status: UserListingStatus) => void;
}

/**
 * Resolves coordinates for a listing.
 *
 * Priority:
 *   1. societyLat/Lon already on the entities (populated during scrape).
 *   2. Look up the societyName in KNOWN_SOCIETIES config (client-side, since lat/lon aren't DB columns).
 *   3. Fall back to PTP anchor with deterministic per-listing golden-angle jitter (~80–110m spread).
 */
function resolveCoords(listing: RentalListing, index: number): { lat: number; lon: number } {
  // 1. Already have coordinates from scrape
  if (listing.entities.societyLat && listing.entities.societyLon) {
    return { lat: listing.entities.societyLat, lon: listing.entities.societyLon };
  }

  // 2. Match by society name against KNOWN_SOCIETIES config
  if (listing.entities.societyName) {
    const nameClean = listing.entities.societyName.toLowerCase().replace(/[\s-]/g, '');
    for (const [key, data] of Object.entries(KNOWN_SOCIETIES)) {
      if (nameClean.includes(key) || key.includes(nameClean)) {
        return { lat: data.lat, lon: data.lon };
      }
    }
  }

  // 3. Fallback: PTP anchor with deterministic golden-angle jitter per listing ID
  const angle = (listing.id * 137.508) % 360;
  const radius = 0.0008 + (listing.id % 3) * 0.0004;
  const jitterLat = radius * Math.cos((angle * Math.PI) / 180);
  const jitterLon = radius * Math.sin((angle * Math.PI) / 180);
  return {
    lat: PTP_COORDINATES.lat + jitterLat,
    lon: PTP_COORDINATES.lon + jitterLon,
  };
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

      /**
       * FIX: API KEY REQUIRED error
       *
       * CartoDB's basemaps.cartocdn.com now requires an API key.
       * Solution: Use standard OpenStreetMap tile.openstreetmap.org tiles which are
       * 100% free with no API key, and apply a CSS dark mode invert filter to
       * match the dark glass dashboard theme.
       *
       * Attribution kept to satisfy OSM tile usage policy.
       */
      const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
      });

      tileLayer.addTo(map);

      // Apply CSS dark mode filter to tile pane — no external API required
      const tilePaneEl = map.getPanes().tilePane as HTMLElement;
      if (tilePaneEl) {
        tilePaneEl.style.filter = 'invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%) saturate(0.8)';
      }

      // Force resize after initialization to prevent stale tile grid
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      // PTP Anchor Pin
      const ptpIcon = L.divIcon({
        className: 'ptp-office-pin',
        html: `
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            font-weight: 800;
            font-size: 11px;
            padding: 4px 10px;
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
        iconSize: [140, 30],
        iconAnchor: [70, 15],
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

    // Remove all existing listing markers (not the PTP anchor)
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker &&
        (layer.options.icon as L.DivIcon | undefined)?.options?.className !== 'ptp-office-pin'
      ) {
        map.removeLayer(layer);
      }
    });

    /**
     * FIX: LISTINGS NOT SHOWN — All were clustering at default coordinate fallback.
     *
     * Step 1: Resolve per-listing coordinates via resolveCoords() (KNOWN_SOCIETIES lookup + jitter).
     * Step 2: Group listings by resolved coordinate for the cluster badge (+N pill).
     * Step 3: Render each group's primary listing as a marker with all cluster members in popup.
     */

    // Step 1 & 2: Build coordinate → listings map
    const coordsMap = new Map<string, RentalListing[]>();
    listings.forEach((l, index) => {
      const { lat, lon } = resolveCoords(l, index);
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (!coordsMap.has(key)) {
        coordsMap.set(key, []);
      }
      coordsMap.get(key)!.push(l);
    });

    // Step 3: Add one marker per coordinate group
    coordsMap.forEach((groupListings, key) => {
      // noUncheckedIndexedAccess: split always produces at least 1 element for non-empty keys,
      // but we parse defensively.
      const parts = key.split(',');
      const lat = parseFloat(parts[0] ?? '0');
      const lon = parseFloat(parts[1] ?? '0');
      const primary = groupListings[0];
      const count = groupListings.length;

      // Guard: skip empty groups (should not occur, but noUncheckedIndexedAccess requires it)
      if (primary === undefined) return;

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
          padding: 3px 8px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 2px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          transition: transform 0.15s ease;
          white-space: nowrap;
        " onmouseover="this.style.transform='scale(1.18)'" onmouseout="this.style.transform='scale(1)'">
          <span>${primary.score >= 90 ? '🔥' : primary.score >= 75 ? '✨' : '⚡'}</span>
          <span>${primary.score} pts</span>
          ${count > 1 ? `<span style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 6px; font-size: 9px;">+${count - 1}</span>` : ''}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'society-marker-pin',
        html: markerHtml,
        iconSize: [90, 26],
        iconAnchor: [45, 13],
      });

      const societyLabel = primary.entities.societyName ?? primary.location ?? 'Near PTP';
      const rentLabel = primary.entities.rent
        ? `₹${primary.entities.rent.toLocaleString('en-IN')}/mo`
        : 'Contact';
      const phoneLabel = primary.entities.contactPhone ? `+91 ${primary.entities.contactPhone}` : '';

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; color: #0f172a; min-width: 220px; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #0f172a;">${societyLabel}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            👤 ${primary.authorName} • 🕒 ${primary.postedTime}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span style="font-size: 15px; font-weight: 800; color: #059669;">${rentLabel}</span>
            <span style="font-size: 11px; font-weight: 600; color: #475569;">⏱️ ${primary.commute.twoWayAvgPeakMins}m peak commute</span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">${primary.bhkType} • ${primary.entities.furnishing}</div>
          ${phoneLabel ? `<div style="font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 8px;">📞 ${phoneLabel}</div>` : ''}
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


    // Invalidate size after markers are placed to ensure correct tile rendering
    mapInstanceRef.current.invalidateSize();

    return () => {
      // Proper Leaflet lifecycle cleanup — prevents duplicate map instances on HMR
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings, onSelectListing]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden glass-panel border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs shadow-lg flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> 🔥 90+ Unicorn
        </div>
        <div className="flex items-center gap-1.5 font-medium text-blue-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span> ✨ 75+ Great
        </div>
        <div className="flex items-center gap-1.5 font-medium text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> ⚡ 55+ Moderate
        </div>
      </div>

      {/* Listing count badge */}
      {listings.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium pointer-events-none">
          {listings.length} listing{listings.length !== 1 ? 's' : ''} on map
        </div>
      )}
    </div>
  );
};
