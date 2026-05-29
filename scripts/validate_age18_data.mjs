#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const dataDir = path.join(root, 'data', 'age18');
const files = [
  'awakening_rules.v0.1.json',
  'stat_conversion_tables.v0.1.json',
  'hidden_fate_reveal_tables.v0.1.json',
  'carried_item_conversion.v0.1.json',
  'destiny_projection_rules.v0.1.json',
  'outer_battlefield_intro_run.v0.1.json',
  'system_home_unlock.v0.1.json',
  'sample_age18_resolutions.v0.1.json'
];

function readJson(file) {
  const full = path.join(dataDir, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

const loaded = Object.fromEntries(files.map(f => [f, readJson(f)]));

for (const [file, json] of Object.entries(loaded)) {
  if (!json.schemaVersion && file !== 'sample_age18_resolutions.v0.1.json') {
    throw new Error(`${file} missing schemaVersion`);
  }
}

const outer = loaded['outer_battlefield_intro_run.v0.1.json'];
if (!Array.isArray(outer.phases) || outer.phases.length === 0) throw new Error('outer phases missing');
let last = -1;
for (const phase of outer.phases) {
  if (!phase.id) throw new Error('phase missing id');
  if (phase.startSec < last) throw new Error(`phase ${phase.id} startSec not sorted`);
  if (phase.endSec < phase.startSec) throw new Error(`phase ${phase.id} invalid endSec`);
  last = phase.startSec;
}
if (!outer.failurePolicy?.retryable) throw new Error('first battle must be retryable');

const home = loaded['system_home_unlock.v0.1.json'];
const moduleIds = new Set();
for (const mod of [...home.baseModules, ...home.conditionalModules]) {
  if (moduleIds.has(mod.id)) throw new Error(`duplicate home module id ${mod.id}`);
  moduleIds.add(mod.id);
}

const stat = loaded['stat_conversion_tables.v0.1.json'];
for (const key of ['maxHp','maxQi','pickupRadius','critChance','passiveQiRegen']) {
  if (!stat.outerBattlefieldIntroStats[key]) throw new Error(`missing stat conversion ${key}`);
}

const reveal = loaded['hidden_fate_reveal_tables.v0.1.json'];
if (!Array.isArray(reveal.progressBands) || reveal.progressBands.length < 4) throw new Error('reveal progress bands insufficient');

const carried = loaded['carried_item_conversion.v0.1.json'];
if (!carried.items || Object.keys(carried.items).length < 4) throw new Error('carried item conversions insufficient');
for (const [itemId, item] of Object.entries(carried.items)) {
  if (!Array.isArray(item.conversions) || item.conversions.length === 0) throw new Error(`${itemId} has no conversions`);
}

console.log(`Age18 data validation passed: ${files.length} files, ${outer.phases.length} intro phases, ${moduleIds.size} home modules.`);
