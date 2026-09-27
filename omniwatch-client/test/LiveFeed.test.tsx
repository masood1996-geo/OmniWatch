import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveFeed } from '../src/components/LiveFeed';
import { EventPopupContent } from '../src/components/MapView';
import type { OmniEvent } from '../src/lib/types';

function makeEvent(overrides: Partial<OmniEvent> = {}): OmniEvent {
  return {
    id: 'e1',
    source: 'usgs',
    title: 'M 6.1 - Offshore earthquake',
    severity: 'major',
    coordinates: { longitude: 10, latitude: 20 },
    timestamp: '2026-09-27T10:00:00.000Z',
    sourceTimestamp: '2026-09-27T10:00:00.000Z',
    fetchedAt: '2026-09-27T10:01:00.000Z',
    eventType: 'earthquake',
    metadata: { magnitude: 6.1 },
    provenance: {
      fetchClass: 'live',
      fetchedAt: '2026-09-27T10:01:00.000Z',
      sourceTimestamp: '2026-09-27T10:00:00.000Z',
      provider: 'USGS Earthquake Hazards Program',
      sourceId: 'usgs',
      license: 'Public domain (USGS)',
      attribution: 'USGS',
      confidence: 0.98,
    },
    ...overrides,
  };
}

describe('LiveFeed', () => {
  it('renders events with provenance fetch-class badges', () => {
    render(<LiveFeed events={[makeEvent(), makeEvent({ id: 'e2', source: 'gdelt', title: 'Headline', provenance: { ...makeEvent().provenance!, fetchClass: 'live', sourceId: 'gdelt' } })]} loading={false} onSelect={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText('M 6.1 - Offshore earthquake')).toBeInTheDocument();
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getAllByText('LIVE')).toHaveLength(2);
  });

  it('shows an empty state and an error state', () => {
    const { rerender } = render(<LiveFeed events={[]} loading={false} onSelect={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText(/No events match/i)).toBeInTheDocument();
    rerender(<LiveFeed events={[]} loading={false} onSelect={() => {}} onRefresh={() => {}} error="API unreachable" />);
    expect(screen.getByText('API unreachable')).toBeInTheDocument();
  });

  it('calls onSelect when an event is clicked', () => {
    const onSelect = vi.fn();
    render(<LiveFeed events={[makeEvent()]} loading={false} onSelect={onSelect} onRefresh={() => {}} />);
    fireEvent.click(screen.getByText('M 6.1 - Offshore earthquake'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe('e1');
  });
});

describe('EventPopupContent provenance', () => {
  it('shows provider, license, fetch class and confidence', () => {
    render(<EventPopupContent event={makeEvent()} />);
    expect(screen.getByText('USGS Earthquake Hazards Program')).toBeInTheDocument();
    expect(screen.getByText('Public domain (USGS)')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('0.98')).toBeInTheDocument();
  });

  it('states when an event is not geolocated', () => {
    render(<EventPopupContent event={makeEvent({ coordinates: null })} />);
    expect(screen.getByText('not geolocated')).toBeInTheDocument();
  });
});
