import {
  Activity, Anchor, BookOpen, Bug, Camera, CloudLightning, Crosshair, Database,
  DollarSign, Eye, Factory, Fish, Flame, Fuel, Globe, Heart, Layers, Lock,
  Map as MapIcon, Mountain, Newspaper, Plane, Radio, RefreshCw, Satellite,
  Shield, ShieldAlert, Siren, Ship, Train, TrendingDown, Tv, Users, Wind, WifiOff, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LayerDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  types: string[];
  sources?: string[];
}

export const LAYER_DEFS: LayerDef[] = [
  { key: 'earthquake', label: 'Earthquakes', icon: Activity, color: '#f97316', types: ['earthquake'] },
  { key: 'fire', label: 'Wildfires (EONET)', icon: Flame, color: '#ef4444', types: ['fire'] },
  { key: 'firmsfire', label: 'FIRMS Fires (VIIRS)', icon: Flame, color: '#ff6b35', types: ['firmsfire'] },
  { key: 'volcano', label: 'Volcanoes (GDACS)', icon: Mountain, color: '#f43f5e', types: ['volcano'] },
  { key: 'weather', label: 'Severe Weather', icon: CloudLightning, color: '#a78bfa', types: ['weather'] },
  { key: 'radiation', label: 'Radiation Monitors', icon: Radio, color: '#eab308', types: ['radiation'] },
  { key: 'airquality', label: 'Air Quality (PM2.5)', icon: Wind, color: '#94a3b8', types: ['airquality'] },
  { key: 'spaceweather', label: 'Space Weather', icon: Zap, color: '#c084fc', types: ['spaceweather'] },
  { key: 'military', label: 'Military Aircraft', icon: Crosshair, color: '#dc2626', types: ['military'], sources: ['adsb.lol'] },
  { key: 'milbases', label: 'Military Bases (OSM)', icon: Shield, color: '#b91c1c', types: ['military'], sources: ['osm-military'] },
  { key: 'conflict', label: 'Conflict Events', icon: ShieldAlert, color: '#ef4444', types: ['conflict'], sources: ['gdelt'] },
  { key: 'ukraine', label: 'Ukraine Frontline', icon: ShieldAlert, color: '#fbbf24', types: ['conflict'], sources: ['deepstate'] },
  { key: 'carriers', label: 'Carrier Strike Groups (AIS)', icon: Anchor, color: '#1d4ed8', types: ['maritime'], sources: ['carrier-ais'] },
  { key: 'maritime', label: 'Maritime Vessels', icon: Ship, color: '#06b6d4', types: ['maritime'], sources: ['aisstream'] },
  { key: 'fishing', label: 'Fishing Activity (GFW)', icon: Fish, color: '#0891b2', types: ['maritime'], sources: ['gfw'] },
  { key: 'flight', label: 'Commercial Flights', icon: Plane, color: '#60a5fa', types: ['flight'] },
  { key: 'satellite', label: 'Military Satellites', icon: Satellite, color: '#818cf8', types: ['satellite'] },
  { key: 'economics', label: 'Markets & Finance', icon: TrendingDown, color: '#10b981', types: ['economics'], sources: ['finnhub', 'yahoo-finance', 'fred'] },
  { key: 'predictions', label: 'Prediction Markets', icon: Globe, color: '#34d399', types: ['economics'], sources: ['polymarket'] },
  { key: 'powerplants', label: 'Power Plants (OSM)', icon: Zap, color: '#f59e0b', types: ['infrastructure'], sources: ['osm-power'] },
  { key: 'datacenters', label: 'Data Centers (PeeringDB)', icon: Database, color: '#8b5cf6', types: ['infrastructure'], sources: ['peeringdb'] },
  { key: 'ioda', label: 'Internet Outages', icon: WifiOff, color: '#6b7280', types: ['infrastructure'], sources: ['ioda'] },
  { key: 'cctv', label: 'Traffic Cameras', icon: Camera, color: '#22d3ee', types: ['infrastructure'], sources: ['tfl-jamcam', 'nyc-dot', 'sg-lta'] },
  { key: 'trains', label: 'Rail Networks', icon: Train, color: '#a3e635', types: ['infrastructure'], sources: ['digitraffic'] },
  { key: 'satnogs', label: 'SatNOGS Stations', icon: Satellite, color: '#14b8a6', types: ['infrastructure'], sources: ['satnogs'] },
  { key: 'kiwisdr', label: 'KiwiSDR Receivers', icon: Radio, color: '#5eead4', types: ['infrastructure'], sources: ['kiwisdr'] },
  { key: 'infra_other', label: 'Other Infrastructure', icon: Factory, color: '#64748b', types: ['infrastructure'], sources: ['overpass(terramind)'] },
  { key: 'cyber', label: 'Cyber Threats (CISA)', icon: Bug, color: '#f43f5e', types: ['cyber'] },
  { key: 'sanctions', label: 'Sanctions Watch', icon: Lock, color: '#dc2626', types: ['sanctions'] },
  { key: 'health', label: 'WHO Health Alerts', icon: Siren, color: '#f97316', types: ['health'] },
  { key: 'humanitarian', label: 'ReliefWeb (UN OCHA)', icon: Heart, color: '#ec4899', types: ['humanitarian'] },
  { key: 'news', label: 'News Headlines (RSS)', icon: Newspaper, color: '#94a3b8', types: ['news'] },
  { key: 'treasury', label: 'US Treasury Yields', icon: DollarSign, color: '#22c55e', types: ['economics'], sources: ['us-treasury'] },
  { key: 'bls', label: 'BLS Employment', icon: Users, color: '#3b82f6', types: ['economics'], sources: ['bls'] },
  { key: 'energy', label: 'Energy (EIA)', icon: Fuel, color: '#f59e0b', types: ['economics'], sources: ['eia'] },
  { key: 'spending', label: 'Federal Spending', icon: DollarSign, color: '#6366f1', types: ['economics'], sources: ['usaspending'] },
  { key: 'social', label: 'Social Intel', icon: Newspaper, color: '#ff4500', types: ['social'], sources: ['reddit(r/worldnews)', 'reddit(r/geopolitics)', 'bluesky'] },
  { key: 'acled', label: 'ACLED Conflicts', icon: ShieldAlert, color: '#991b1b', types: ['conflict'], sources: ['acled'] },
  { key: 'patents', label: 'Patent Intelligence', icon: BookOpen, color: '#a855f7', types: ['technology'], sources: ['uspto'] },
];

export const VISUAL_MODES = ['standard', 'satellite', 'flir', 'nvg', 'crt'] as const;
export type VisualMode = typeof VISUAL_MODES[number];

export const VISUAL_MODE_META: Record<VisualMode, { icon: LucideIcon; label: string }> = {
  standard: { icon: MapIcon, label: 'STD' },
  satellite: { icon: Satellite, label: 'SAT' },
  flir: { icon: Flame, label: 'FLIR' },
  nvg: { icon: Eye, label: 'NVG' },
  crt: { icon: Tv, label: 'CRT' },
};

export { Layers, RefreshCw };
