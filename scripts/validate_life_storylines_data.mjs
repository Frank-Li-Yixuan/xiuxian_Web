#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'data', 'life_storylines');

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(base, p), 'utf8'));
}

const storylines = readJson('storyline_definitions.v0.1.json').storylines;
const threads = readJson('event_threads.v0.1.json').eventThreads;
const rules = readJson('storyline_scoring_rules.v0.1.json');

const errors = [];
const ids = new Set();

for (const s of storylines) {
  if (!s.id || !s.name) errors.push(`storyline missing id/name: ${JSON.stringify(s)}`);
  if (ids.has(s.id)) errors.push(`duplicate storyline id: ${s.id}`);
  ids.add(s.id);
  if (!Array.isArray(s.eventThreadIds) || s.eventThreadIds.length < 1) errors.push(`${s.id} has no eventThreadIds`);
  if (!Array.isArray(s.activationSignals) || s.activationSignals.length < 1) errors.push(`${s.id} has no activationSignals`);
}

const storylineIds = new Set(storylines.map(s => s.id));
const threadIds = new Set();

for (const t of threads) {
  if (!t.id || !t.storylineId) errors.push(`thread missing id/storylineId: ${JSON.stringify(t)}`);
  if (threadIds.has(t.id)) errors.push(`duplicate thread id: ${t.id}`);
  threadIds.add(t.id);
  if (!storylineIds.has(t.storylineId)) errors.push(`${t.id} references unknown storyline ${t.storylineId}`);
  if (!Array.isArray(t.stageSequence) || t.stageSequence.length < 3) errors.push(`${t.id} needs at least 3 stages`);
}

for (const s of storylines) {
  for (const tid of s.eventThreadIds) {
    if (!threadIds.has(tid)) errors.push(`${s.id} references missing thread ${tid}`);
  }
}

if (!rules.statusThresholds || !rules.threadStageThresholds) errors.push('scoring rules missing thresholds');

if (errors.length) {
  console.error('Life storyline data validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Life storyline data validation passed: ${storylines.length} storylines, ${threads.length} threads.`);
