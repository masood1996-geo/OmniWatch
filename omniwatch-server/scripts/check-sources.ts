import { loadConfig } from '../src/config';
import { buildRegistry } from '../src/sources/registry';

async function main(): Promise<void> {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.replace('--only=', '').split(',').map(s => s.trim())) : null;
  const config = loadConfig();
  const registry = buildRegistry(config);
  const targets = registry.filter(a => !only || only.has(a.id));
  let ok = 0;
  let disabled = 0;
  let errors = 0;

  for (const adapter of targets) {
    if (adapter.fetchClass === 'disabled') {
      disabled += 1;
      console.log(`${adapter.id.padEnd(16)} DISABLED  ${adapter.disabledReason || ''}`);
      continue;
    }
    const started = Date.now();
    try {
      const events = await Promise.race([
        adapter.fetch({ now: new Date() }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('adapter timed out after 90s')), 90000)),
      ]);
      ok += 1;
      console.log(`${adapter.id.padEnd(16)} OK        count=${String(events.length).padEnd(5)} ${Date.now() - started}ms`);
    } catch (err) {
      errors += 1;
      console.log(`${adapter.id.padEnd(16)} ERROR     ${(err as Error).message}`);
    }
  }
  console.log(`\nTotal: ${ok} ok, ${disabled} disabled, ${errors} error (${targets.length} adapters)`);
  process.exit(0);
}

void main();
