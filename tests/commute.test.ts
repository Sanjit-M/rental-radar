import { describe, it, expect } from 'vitest';
import { calculatePeakScooterCommute } from '../src/domain/commute/router';

describe('Weekday Peak Scooter Commute Simulator', () => {
  it('calculates 11am-1pm inbound and 4pm-6pm outbound congestion for direct Kadubeesanahalli', () => {
    // Sobha Iris coordinates (12.9372, 77.6934) ~ 0.5 km from PTP
    const commute = calculatePeakScooterCommute(12.9372, 77.6934, 'Kadubeesanahalli', true);
    
    expect(commute.distanceKm).toBeGreaterThan(0.4);
    expect(commute.distanceKm).toBeLessThan(1.5);
    expect(commute.inboundMins).toBeGreaterThanOrEqual(2);
    expect(commute.outboundMins).toBeGreaterThanOrEqual(commute.inboundMins);
    expect(commute.hasPanathurUnderpassBottleneck).toBe(false);
    expect(commute.twoWayAvgPeakMins).toBeLessThanOrEqual(7);
  });

  it('applies Panathur Railway Underpass (RUB) bottleneck delay for Panathur side', () => {
    // Panathur side coordinates
    const commute = calculatePeakScooterCommute(12.9340, 77.7010, 'Panathur Road', false);
    
    expect(commute.hasPanathurUnderpassBottleneck).toBe(true);
    expect(commute.outboundMins).toBeGreaterThanOrEqual(10);
    expect(commute.twoWayAvgPeakMins).toBeGreaterThan(7);
  });
});
