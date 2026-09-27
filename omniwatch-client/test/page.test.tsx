import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/components/MapView', () => ({
  MapView: () => <div data-testid="map-stub" />,
  EventPopupContent: () => null,
}));

const sampleEvent = {
  id: 'live-1',
  source: 'usgs',
  title: 'M 5.8 - Test earthquake',
  severity: 'major' as const,
  coordinates: { longitude: 12, latitude: 34 },
  timestamp: '2026-09-27T10:00:00.000Z',
  sourceTimestamp: '2026-09-27T10:00:00.000Z',
  fetchedAt: '2026-09-27T10:01:00.000Z',
  eventType: 'earthquake',
  metadata: {},
  provenance: {
    fetchClass: 'live' as const,
    fetchedAt: '2026-09-27T10:01:00.000Z',
    sourceTimestamp: '2026-09-27T10:00:00.000Z',
    provider: 'USGS Earthquake Hazards Program',
    sourceId: 'usgs',
    license: 'Public domain (USGS)',
    attribution: 'USGS',
    confidence: 0.98,
  },
};

vi.mock('../src/lib/api', () => ({
  fetchEvents: vi.fn(async () => ({
    success: true,
    count: 1,
    totalCount: 1,
    timestamp: new Date().toISOString(),
    sources: { usgs: { status: 'ok', count: 1, fetchClass: 'live', latencyMs: 100, lastSuccessAt: new Date().toISOString(), lastErrorAt: null, consecutiveFailures: 0 } },
    sweepDurationMs: 1234,
    refreshIntervalMs: 900000,
    provenanceCounts: { live: 1 },
    events: [sampleEvent],
  })),
  fetchHealth: vi.fn(async () => ({
    status: 'operational',
    lastSweep: new Date().toISOString(),
    totalSignals: 1,
    totalSources: 49,
    liveSources: 33,
    disabledSources: 14,
    errorSources: 0,
    sources: {},
    sourceHealth: [],
  })),
  fetchLiveTracks: vi.fn(async () => ({ success: true, count: 0, aircraft: 0, vessels: 0, timestamp: new Date().toISOString(), tracks: [] })),
  sendChat: vi.fn(async () => ({ reply: 'ok', mode: 'llm' })),
  apiSourceLink: () => 'https://github.com/masood1996-geo/OmniWatch',
  streamUrl: () => 'http://localhost/api/stream',
}));

import OmniWatchDashboard from '../src/app/page';

describe('dashboard smoke test', () => {
  it('renders fetched events with provenance badges and no hardcoded API host', async () => {
    render(<OmniWatchDashboard />);
    const titles = await screen.findAllByText('M 5.8 - Test earthquake');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
    expect(screen.getByText(/Provenance-tracked OSINT/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument());
  });
});
