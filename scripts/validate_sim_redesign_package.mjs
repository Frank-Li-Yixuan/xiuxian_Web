import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const required = [
  'README.md',
  'MANIFEST.json',
  'docs/sim_redesign_integration_codex_route_v0.1.md',
  'docs/prompt_execution_order_v0.1.md',
  'docs/migration_plan_current_to_v02.md',
  'codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md',
  'codex_prompts/00_SIM_REDESIGN_BOOTSTRAP.md',
  'data/sim_redesign/execution_plan.v0.1.json'
];

let ok = true;
for (const rel of required) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${rel}`);
    ok = false;
  }
}
for (const rel of [
  'MANIFEST.json',
  'data/sim_redesign/execution_plan.v0.1.json',
  'data/sim_redesign/prompt_status_matrix.v0.1.json',
  'data/sim_redesign/integration_milestones.v0.1.json',
  'data/sim_redesign/test_gates.v0.1.json',
  'data/sim_redesign/package_dependency_map.v0.1.json'
]) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (e) {
    console.error(`Invalid JSON: ${rel}: ${e.message}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('SIM-REDESIGN package validation passed.');
