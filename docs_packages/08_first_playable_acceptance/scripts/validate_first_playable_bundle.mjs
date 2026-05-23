#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'docs/first_playable_integration_acceptance_v0.1.md',
  'docs/feature_scope_matrix_v0.1.md',
  'docs/codex_execution_order_v0.1.md',
  'docs/end_to_end_playtest_script_v0.1.md',
  'data/acceptance/first_playable_gate.v0.1.json',
  'data/acceptance/feature_flags.v0.1.json',
  'data/acceptance/build_milestones.v0.1.json',
  'data/acceptance/acceptance_checklist.v0.1.json',
  'src/types/acceptance-types.v0.1.ts'
];

let ok = true;
for (const rel of required) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${rel}`);
    ok = false;
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

for (const file of walk(root).filter(p => p.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON: ${path.relative(root, file)}\n${err.message}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('First Playable acceptance bundle validation passed.');
