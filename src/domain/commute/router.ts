import { PTP_COORDINATES, LOCALITY_COORDS, TRAFFIC_CONFIG } from '../config';
import { CommuteWindow, makeKilometers, makeMinutes } from '../types';

/**
 * Calculates straight-line Haversine geographic distance between two coordinates in kilometers.
 *
 * @param lat1 - Origin latitude.
 * @param lon1 - Origin longitude.
 * @param lat2 - Destination latitude.
 * @param lon2 - Destination longitude.
 * @returns Distance in kilometers.
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Simulates scooter commute duration during Monday–Friday Bangalore peak windows:
 * - Inbound (11:00 AM – 1:00 PM IST): 1.30x baseline travel time.
 * - Outbound (4:00 PM – 6:00 PM IST): 1.65x baseline travel time.
 * - Panathur Underpass bottleneck delay (+8 min).
 *
 * @param originLat - Optional origin latitude.
 * @param originLon - Optional origin longitude.
 * @param locationName - Optional string location identifier for lookup.
 * @param isKadubeesanahalliDirect - Whether route avoids Panathur Underpass.
 * @returns CommuteWindow record with branded Kilometers and Minutes.
 */
export function calculatePeakScooterCommute(
  originLat?: number,
  originLon?: number,
  locationName?: string,
  isKadubeesanahalliDirect: boolean = true
): CommuteWindow {
  let lat = originLat;
  let lon = originLon;

  // Resolve coordinates from location string if not passed
  if (lat === undefined || lon === undefined) {
    if (locationName) {
      const locKey = locationName.toLowerCase().trim();
      for (const [key, coords] of Object.entries(LOCALITY_COORDS)) {
        if (locKey.includes(key)) {
          lat = coords.lat;
          lon = coords.lon;
          if (!coords.isDirect) {
            isKadubeesanahalliDirect = false;
          }
          break;
        }
      }
    }

    // Default to Kadubeesanahalli center
    if (lat === undefined || lon === undefined) {
      lat = LOCALITY_COORDS['kadubeesanahalli'].lat;
      lon = LOCALITY_COORDS['kadubeesanahalli'].lon;
    }
  }

  const straightDist = calculateHaversineDistanceKm(lat, lon, PTP_COORDINATES.lat, PTP_COORDINATES.lon);
  const roadDist = Math.max(0.5, Math.round(straightDist * 1.35 * 10) / 10); // Urban road winding factor

  const baselineMinutes = Math.max(2.0, (roadDist / TRAFFIC_CONFIG.baseScooterSpeedKmh) * 60);

  // Inbound Window: 11:00 AM – 1:00 PM IST (1.30x congestion factor)
  const inboundMins = Math.max(2, Math.round(baselineMinutes * TRAFFIC_CONFIG.inboundMultiplier));

  // Outbound Window: 4:00 PM – 6:00 PM IST (1.65x congestion factor)
  let outboundMins = Math.max(2, Math.round(baselineMinutes * TRAFFIC_CONFIG.outboundMultiplier));

  // Panathur Railway Underpass (RUB) choke point delay
  const hasPanathurUnderpassBottleneck = !isKadubeesanahalliDirect;
  if (hasPanathurUnderpassBottleneck) {
    outboundMins += TRAFFIC_CONFIG.panathurUnderpassDelayMins;
  }

  const twoWayAvgPeakMins = Math.round((inboundMins + outboundMins) / 2.0);

  return {
    distanceKm: makeKilometers(roadDist),
    inboundMins: makeMinutes(inboundMins),
    outboundMins: makeMinutes(outboundMins),
    twoWayAvgPeakMins: makeMinutes(twoWayAvgPeakMins),
    hasPanathurUnderpassBottleneck,
  };
}
