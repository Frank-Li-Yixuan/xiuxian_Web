#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data/life_interludes');

function readJson(name) {
  const p = path.join(dataDir, name);
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const modes = readJson('interlude_mode_definitions.v0.1.json');
const catalog = readJson('interlude_event_catalog.v0.1.json');
const writebacks = readJson('interlude_result_writeback_rules.v0.1.json');
const freq = readJson('interlude_frequency_budget.v0.1.json');

const modeIds = new Set(modes.modes.map(m => m.id));
const writebackIds = new Set(writebacks.rules.map(r => r.id));

let errors = [];

for (const m of modes.modes) {
  if (!m.id || !m.name || !m.displayName) errors.push(`Bad mode: ${JSON.stringify(m)}`);
}

for (const it of catalog.interludes) {
  if (!it.id) errors.push('Interlude missing id');
  if (!modeIds.has(it.mode)) errors.push(`${it.id} references unknown mode ${it.mode}`);
  if (!Array.isArray(it.ageRange) || it.ageRange.length !== 2 || it.ageRange[0] > it.ageRange[1]) {
    errors.push(`${it.id} bad ageRange`);
  }
  if (!writebackIds.has(it.resultWritebackId)) {
    errors.push(`${it.id} references missing writeback ${it.resultWritebackId}`);
  }
  if (!it.description || !it.worldExplanation) {
    errors.push(`${it.id} missing description/worldExplanation`);
  }
}

if (!freq.agePhaseBudgets || !Array.isArray(freq.agePhaseBudgets)) {
  errors.push('frequency budget missing agePhaseBudgets');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Life interlude data validation passed: ${modes.modes.length} modes, ${catalog.interludes.length} interludes, ${writebacks.rules.length} writeback rules.`);
