import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'data', 'destiny_v2');
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
}

const defs = readJson('core_destiny_definitions.v0.1.json');
const conflicts = readJson('conflict_synergy_mutation_rules.v0.1.json');
const manifestations = readJson('life_manifestation_hooks.v0.1.json');
const modeHooks = readJson('mode_projection_hooks.v0.1.json');

const ids = new Set();
for (const d of defs.destinies) {
  if (!d.id || !d.name) throw new Error('Destiny missing id/name');
  if (ids.has(d.id)) throw new Error(`Duplicate destiny id: ${d.id}`);
  ids.add(d.id);
}

function assertId(id, where) {
  if (!ids.has(id)) throw new Error(`${where} references missing destiny id: ${id}`);
}

for (const d of defs.destinies) {
  if (d.mutation) {
    for (const k of ['antiResult', 'weakSupportResult', 'sourceConflictResult']) {
      if (d.mutation[k]) assertId(d.mutation[k], `${d.id}.mutation.${k}`);
    }
  }
  const src = d.eligibility?.sourceMutationOf;
  if (src) for (const id of src) assertId(id, `${d.id}.sourceMutationOf`);
}

for (const c of conflicts.hardConflicts || []) {
  assertId(c.a, 'hardConflict.a');
  assertId(c.b, 'hardConflict.b');
  if (c.mutation) assertId(c.mutation, 'hardConflict.mutation');
}
for (const c of conflicts.softConflicts || []) {
  assertId(c.a, 'softConflict.a');
  assertId(c.b, 'softConflict.b');
}
for (const s of conflicts.synergies || []) {
  for (const id of s.ids || []) assertId(id, 'synergy.ids');
}
for (const m of manifestations.destinyManifestations || []) {
  assertId(m.destinyId, 'manifestation.destinyId');
  if (!Array.isArray(m.events) || m.events.length === 0) throw new Error(`Manifestation has no events: ${m.destinyId}`);
}
for (const p of modeHooks.projections || []) {
  assertId(p.destinyId, 'modeProjection.destinyId');
}

console.log(`Destiny eligibility data validation passed: ${ids.size} destinies, ${(conflicts.hardConflicts||[]).length} hard conflicts, ${(conflicts.synergies||[]).length} synergies.`);
