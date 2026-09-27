import { describe, expect, it } from 'vitest';
import { magnitudeToSeverity } from '../src/clients/usgs';
import { frpToSeverity } from '../src/clients/firms';
import { pm25ToSeverity } from '../src/clients/airquality';
import { cpmToSeverity } from '../src/clients/safecast';
import { noaaSeverity, normalizeNoaaAlerts } from '../src/clients/noaa';

describe('severity mapping', () => {
  it('maps USGS magnitudes to the documented four levels', () => {
    expect(magnitudeToSeverity(2.5)).toBe('minor');
    expect(magnitudeToSeverity(4.0)).toBe('moderate');
    expect(magnitudeToSeverity(5.5)).toBe('major');
    expect(magnitudeToSeverity(7.1)).toBe('critical');
  });

  it('maps FIRMS FRP to the documented thresholds', () => {
    expect(frpToSeverity(5)).toBe('minor');
    expect(frpToSeverity(11)).toBe('moderate');
    expect(frpToSeverity(51)).toBe('major');
    expect(frpToSeverity(201)).toBe('critical');
  });

  it('maps PM2.5 values to the documented thresholds', () => {
    expect(pm25ToSeverity(10)).toBe('minor');
    expect(pm25ToSeverity(40)).toBe('moderate');
    expect(pm25ToSeverity(80)).toBe('major');
    expect(pm25ToSeverity(200)).toBe('critical');
  });

  it('maps Safecast CPM values to the documented thresholds', () => {
    expect(cpmToSeverity(10)).toBe('minor');
    expect(cpmToSeverity(60)).toBe('moderate');
    expect(cpmToSeverity(120)).toBe('major');
    expect(cpmToSeverity(400)).toBe('critical');
  });

  it('maps NOAA severity strings', () => {
    expect(noaaSeverity('Extreme')).toBe('critical');
    expect(noaaSeverity('Severe')).toBe('major');
    expect(noaaSeverity('Moderate')).toBe('moderate');
    expect(noaaSeverity('Minor')).toBe('minor');
    expect(noaaSeverity(undefined)).toBe('minor');
  });
});

describe('NOAA normalization', () => {
  const feature = (id: string, severity: string, ring: number[][]) => ({
    id,
    properties: { id, event: 'Test Alert', severity, effective: '2026-09-27T10:00:00Z' },
    geometry: { type: 'Polygon', coordinates: [ring] },
  });

  it('uses the polygon centroid, not the first vertex', () => {
    const ring = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
    const alerts = normalizeNoaaAlerts({ features: [feature('a', 'Severe', ring)] });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].coordinates).toEqual({ longitude: 1, latitude: 1 });
  });

  it('handles MultiPolygon geometry', () => {
    const payload = {
      features: [{
        id: 'mp',
        properties: { id: 'mp', event: 'Flood', severity: 'Moderate' },
        geometry: { type: 'MultiPolygon', coordinates: [[[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]]] },
      }],
    };
    const alerts = normalizeNoaaAlerts(payload);
    expect(alerts[0].coordinates).toEqual({ longitude: 11, latitude: 11 });
  });

  it('caps alerts and keeps the most severe first', () => {
    const features = Array.from({ length: 80 }, (_, i) =>
      feature(`f${i}`, i % 2 === 0 ? 'Minor' : 'Extreme', [[0, 0], [1, 0], [0, 1], [0, 0]]));
    const alerts = normalizeNoaaAlerts(payload(features));
    expect(alerts).toHaveLength(50);
    expect(alerts[0].severity).toBe('critical');
  });

  it('keeps stable IDs based on the provider id', () => {
    const first = normalizeNoaaAlerts({ features: [feature('stable-id', 'Minor', [[0, 0], [1, 0], [0, 1], [0, 0]])] });
    const second = normalizeNoaaAlerts({ features: [feature('stable-id', 'Minor', [[0, 0], [1, 0], [0, 1], [0, 0]])] });
    expect(first[0].id).toBe(second[0].id);
  });

  function payload(features: unknown[]) {
    return { features };
  }
});
