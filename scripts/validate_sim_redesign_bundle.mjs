import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'README.md',
  'MANIFEST.json',
  'docs/sim_redesign_integration_codex_roadmap_v0.1.md',
  'data/sim_redesign/execution_order.v0.1.json',
  'data/sim_redesign/module_dependency_graph.v0.1.json',
  'src/types/sim-redesign-integration-types.v0.1.ts'
];

let ok = true;
for (const rel of required) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${rel}`);
    ok = false;
  }
}

for (const rel of fs.readdirSync(path.join(root, 'data/sim_redesign')).filter(f => f.endsWith('.json'))) {
  const p = path.join(root, 'data/sim_redesign', rel);
  try {
    JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON: ${rel}: ${err.message}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('SIM redesign bundle validation passed.');
