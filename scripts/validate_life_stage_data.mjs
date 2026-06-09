#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const base = process.cwd();
const dataDir = path.join(base, 'data/life_stage');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
}

function assert(cond, msg) {
  if (!cond) {
    console.error('Validation failed:', msg);
    process.exit(1);
  }
}

const age = readJson('life_age_phase_definitions.v0.1.json');
const stages = readJson('cultivation_identity_stages.v0.1.json');
const transitions = readJson('transition_trigger_rules.v0.1.json');
const nodes = readJson('initiation_node_definitions.v0.1.json');
const rhythm = readJson('rhythm_budget_rules.v0.1.json');

const ageIds = new Set(age.agePhases.map(x => x.id));
const stageIds = new Set(stages.identityStages.map(x => x.id));

assert(age.agePhases.length >= 5, 'expected at least 5 age phases');
assert(stages.identityStages.length >= 7, 'expected at least 7 identity stages');

for (const r of rhythm.rhythmBudgetRules) {
  assert(ageIds.has(r.agePhaseId), `rhythm rule references unknown age phase ${r.agePhaseId}`);
}
for (const t of transitions.transitionRules) {
  assert(t.id, 'transition missing id');
  for (const f of t.from) {
    if (f !== 'age18_resolution_pending') assert(stageIds.has(f) || f === 'mortal_child', `unknown transition from ${f}`);
  }
  for (const to of t.to) {
    if (to !== 'age18_resolution_pending') assert(stageIds.has(to), `unknown transition to ${to}`);
  }
}
for (const n of nodes.initiationNodes) {
  assert(n.id && n.name, 'initiation node missing id/name');
  if (n.requiredIdentityStages) {
    for (const s of n.requiredIdentityStages) assert(stageIds.has(s), `node ${n.id} references unknown stage ${s}`);
  }
}

console.log(`Life stage data validation passed: ${age.agePhases.length} age phases, ${stages.identityStages.length} identity stages, ${nodes.initiationNodes.length} initiation nodes.`);
