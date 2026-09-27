import { createHash } from 'crypto';
import type { Coordinates } from '../types';

export const USER_AGENT = 'OmniWatch/2.0 (+https://github.com/masood1996-geo/OmniWatch)';

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T = any>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${new URL(url).host}`);
  }
  return (await res.json()) as T;
}

export function hashId(...parts: Array<string | number | null | undefined>): string {
  const h = createHash('sha1');
  h.update(parts.map(p => String(p ?? '')).join('|'));
  return h.digest('hex').slice(0, 16);
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function ringCentroid(ring: number[][]): Coordinates | null {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let points = ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1]) {
    points = ring.slice(0, -1);
  }
  let sumLon = 0;
  let sumLat = 0;
  let n = 0;
  for (const point of points) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const lon = Number(point[0]);
    const lat = Number(point[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    sumLon += lon;
    sumLat += lat;
    n += 1;
  }
  if (n === 0) return null;
  return { longitude: sumLon / n, latitude: sumLat / n };
}

export function polygonCentroid(coordinates: any): Coordinates | null {
  if (!Array.isArray(coordinates)) return null;
  let ring = coordinates;
  while (Array.isArray(ring) && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
    ring = ring[0];
  }
  if (Array.isArray(ring) && Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
    return ringCentroid(ring);
  }
  return null;
}

export function validCoord(lon: unknown, lat: unknown): Coordinates | null {
  const x = Number(lon);
  const y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -180 || x > 180 || y < -90 || y > 90) return null;
  return { longitude: x, latitude: y };
}
