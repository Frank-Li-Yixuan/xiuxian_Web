import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'sim_redesign');
const files = [
  'module_matrix.v0.1.json',
  'execution_plan.v0.1.json',
  'migration_rules.v0.1.json',
  'acceptance_gates.v0.1.json'
];
for (const file of files) {
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  JSON.parse(fs.readFileSync(p, 'utf8'));
}
const plan = JSON.parse(fs.readFileSync(path.join(dataDir, 'execution_plan.v0.1.json'), 'utf8'));
if (!Array.isArray(plan.phases) || plan.phases.length < 4) {
  throw new Error('execution_plan must define at least 4 phases');
}
console.log(`SIM redesign data validation passed: ${files.length} files, ${plan.phases.length} phases.`);
