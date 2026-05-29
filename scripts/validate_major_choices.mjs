#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'life_choices');
const eventsPath = path.join(dataDir, 'major_choice_events.v0.1.json');
const archetypesPath = path.join(dataDir, 'choice_archetypes.v0.1.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function fail(msg) {
  console.error(`Validation failed: ${msg}`);
  process.exit(1);
}

const eventsFile = readJson(eventsPath);
const archetypes = readJson(archetypesPath);
const validRisks = new Set(archetypes.riskTiers.map((r) => r.id));
const ids = new Set();

for (const event of eventsFile.events ?? []) {
  if (!event.id) fail('event missing id');
  if (ids.has(event.id)) fail(`duplicate event id: ${event.id}`);
  ids.add(event.id);

  if (!event.title || !event.description) fail(`${event.id} missing title/description`);
  if (!Array.isArray(event.phaseIds) || event.phaseIds.length === 0) fail(`${event.id} missing phaseIds`);
  if (!Array.isArray(event.ageRangeMonths) || event.ageRangeMonths.length !== 2) fail(`${event.id} invalid ageRangeMonths`);
  if (!Array.isArray(event.options) || event.options.length < 3) fail(`${event.id} needs at least 3 options`);

  const optionIds = new Set();
  for (const opt of event.options) {
    if (!opt.id) fail(`${event.id} option missing id`);
    if (optionIds.has(opt.id)) fail(`${event.id} duplicate option id ${opt.id}`);
    optionIds.add(opt.id);
    if (!validRisks.has(opt.riskTier)) fail(`${event.id}.${opt.id} invalid riskTier ${opt.riskTier}`);
    if (!opt.outcomes || !opt.outcomes.success) fail(`${event.id}.${opt.id} must define outcomes.success`);
    for (const [tier, outcome] of Object.entries(opt.outcomes)) {
      if (!outcome.text) fail(`${event.id}.${opt.id}.${tier} missing text`);
      if (!Array.isArray(outcome.effects)) fail(`${event.id}.${opt.id}.${tier} missing effects array`);
      for (const eff of outcome.effects) {
        if (!eff.type) fail(`${event.id}.${opt.id}.${tier} effect missing type`);
        if (eff.type === 'modifyHiddenFate' && eff.visible !== false) {
          fail(`${event.id}.${opt.id}.${tier} hidden fate effect must be visible=false`);
        }
      }
    }
  }
}

console.log(`Major choice data validation passed: ${eventsFile.events.length} events.`);
