import type { EventsResponse, HealthResponse, LiveTrackingResponse } from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function apiSourceLink(): string {
  return process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/masood1996-geo/OmniWatch';
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(apiUrl(path), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`${path} responded HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchEvents(signal?: AbortSignal): Promise<EventsResponse> {
  return getJson<EventsResponse>('/api/events', signal);
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>('/api/health', signal);
}

export function fetchLiveTracks(signal?: AbortSignal): Promise<LiveTrackingResponse> {
  return getJson<LiveTrackingResponse>('/api/live-tracking', signal);
}

export async function sendChat(query: string): Promise<{ reply: string; mode?: string }> {
  const res = await fetch(apiUrl('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`chat responded HTTP ${res.status}`);
  return res.json();
}

export function streamUrl(): string {
  return apiUrl('/api/stream');
}
