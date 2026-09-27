import type { FetchClass, Severity } from './types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  major: '#f97316',
  moderate: '#facc15',
  minor: '#3b82f6',
};

export const FETCH_CLASS_META: Record<FetchClass, { label: string; color: string; description: string }> = {
  live: { label: 'LIVE', color: '#22c55e', description: 'Fetched directly from the provider during the latest sweep' },
  delayed: { label: 'DELAYED', color: '#eab308', description: 'Provider data has inherent latency (elements, snapshots, unofficial endpoints)' },
  static: { label: 'STATIC', color: '#94a3b8', description: 'Reference dataset with a fixed verification date; never presented as live' },
  simulated: { label: 'SIMULATED', color: '#a855f7', description: 'Synthetic data, e.g. alert test events. Never real intelligence' },
  disabled: { label: 'NO DATA', color: '#6b7280', description: 'Source is disabled or missing credentials; no events are shown' },
};

export function severityColor(severity: Severity): string {
  return SEVERITY_COLORS[severity] ?? '#3b82f6';
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatCount(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

export function hasCoordinates(event: { coordinates: { longitude: number; latitude: number } | null }): boolean {
  if (!event.coordinates) return false;
  const { longitude, latitude } = event.coordinates;
  return Number.isFinite(longitude) && Number.isFinite(latitude) && (longitude !== 0 || latitude !== 0);
}
