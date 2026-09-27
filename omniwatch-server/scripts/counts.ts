import fs from 'fs';
import path from 'path';
import { loadConfig } from '../src/config';
import { buildRegistry } from '../src/sources/registry';

const config = loadConfig({ NODE_ENV: 'test' });
const registry = buildRegistry(config);
const classes = registry.reduce<Record<string, number>>((acc, a) => {
  acc[a.fetchClass] = (acc[a.fetchClass] || 0) + 1;
  return acc;
}, {});

const layersPath = path.join(__dirname, '..', '..', 'omniwatch-client', 'src', 'lib', 'layers.ts');
const layersSource = fs.readFileSync(layersPath, 'utf8');
const layerCount = (layersSource.match(/\{\s*key:\s*'/g) || []).length;

console.log(JSON.stringify({
  adapters: registry.length,
  fetchClassCounts: classes,
  keyGated: registry.filter(a => (a.requiresKeys || []).length > 0).length,
  layers: layerCount,
  refreshIntervalMinutes: config.refreshIntervalMs / 60000,
  clientRouteCount: 1,
}, null, 2));
