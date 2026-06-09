#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data/life_sim_v02');
const eventPath = path.join(dataDir, 'monthly_event_pool.v0.2.json');
const categoriesPath = path.join(dataDir, 'monthly_event_categories.v0.2.json');
const tiersPath = path.join(dataDir, 'monthly_event_tiers.v0.2.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const eventsFile = readJson(eventPath);
const categoriesFile = readJson(categoriesPath);
const tiersFile = readJson(tiersPath);

const categories = new Set(categoriesFile.categories.map(c => c.id));
const tiers = new Set(tiersFile.tiers.map(t => t.id));
const ids = new Set();
let errors = [];

for (const event of eventsFile.events) {
  if (!event.id) errors.push(`Missing id: ${JSON.stringify(event).slice(0,80)}`);
  if (ids.has(event.id)) errors.push(`Duplicate event id: ${event.id}`);
  ids.add(event.id);

  if (!event.title) errors.push(`Missing title: ${event.id}`);
  if (!event.phase) errors.push(`Missing phase: ${event.id}`);
  if (!Array.isArray(event.ageMonthRange) || event.ageMonthRange.length !== 2) {
    errors.push(`Invalid ageMonthRange: ${event.id}`);
  } else {
    const [a,b] = event.ageMonthRange;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b > 216) {
      errors.push(`Out of range ageMonthRange: ${event.id}: ${a}-${b}`);
    }
  }

  if (!categories.has(event.category)) errors.push(`Unknown category ${event.category}: ${event.id}`);
  if (!tiers.has(event.tier)) errors.push(`Unknown tier ${event.tier}: ${event.id}`);
  if (!(event.baseWeight > 0)) errors.push(`baseWeight must be > 0: ${event.id}`);
  if (!Array.isArray(event.tags)) errors.push(`tags must be array: ${event.id}`);
  if (!Array.isArray(event.visibleEffects)) errors.push(`visibleEffects must be array: ${event.id}`);
  if (!Array.isArray(event.hiddenEffects)) errors.push(`hiddenEffects must be array: ${event.id}`);
  if (!Array.isArray(event.hooks)) errors.push(`hooks must be array: ${event.id}`);
  if (event.interludeCandidate && !String(event.interludeCandidate).startsWith('interlude_')) {
    errors.push(`interludeCandidate should start with interlude_: ${event.id}`);
  }
  if (event.stageTransitionSignal && !String(event.stageTransitionSignal).startsWith('transition_')) {
    errors.push(`stageTransitionSignal should start with transition_: ${event.id}`);
  }
  const visible = JSON.stringify(event.visibleEffects) + event.description + event.title;
  const forbidden = ['古雷真血','丹圣遗骨','系统共鸣体','前世剑魄','魔印微痕'];
  for (const f of forbidden) {
    if (visible.includes(f)) errors.push(`Visible text leaks hidden true name ${f}: ${event.id}`);
  }
  if (!event.llmBrief || event.llmBrief.mustNotRevealHiddenTrueName !== true) {
    errors.push(`llmBrief.mustNotRevealHiddenTrueName must be true: ${event.id}`);
  }
}

if (errors.length) {
  console.error('Monthly event v0.2 validation failed:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}

const byPhase = {};
const byTier = {};
for (const e of eventsFile.events) {
  byPhase[e.phase] = (byPhase[e.phase] ?? 0) + 1;
  byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
}
console.log(`Monthly event v0.2 validation passed: ${eventsFile.events.length} events.`);
console.log('By phase:', JSON.stringify(byPhase));
console.log('By tier:', JSON.stringify(byTier));
