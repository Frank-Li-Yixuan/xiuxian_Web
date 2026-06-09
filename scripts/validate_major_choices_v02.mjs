#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'life_choices_v02');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
}

const archetypes = readJson('choice_archetypes.v0.2.json').archetypes;
const events = readJson('major_choice_events.v0.2.json').events;
readJson('choice_generation_rules.v0.2.json');
const hidden = readJson('hidden_branch_rules.v0.2.json').rules;

const archetypeIds = new Set(archetypes.map(a => a.id));
const eventIds = new Set();

for (const event of events) {
  if (!event.id || eventIds.has(event.id)) throw new Error(`Duplicate/missing event id ${event.id}`);
  eventIds.add(event.id);
  if (!Array.isArray(event.phaseIds) || event.phaseIds.length === 0) throw new Error(`Event ${event.id} missing phaseIds`);
  if (!Array.isArray(event.ageMonthRange) || event.ageMonthRange.length !== 2) throw new Error(`Event ${event.id} invalid ageMonthRange`);
  if (!Array.isArray(event.options) || event.options.length < 3) throw new Error(`Event ${event.id} has fewer than 3 options`);
  const optionIds = new Set();
  for (const option of event.options) {
    if (!option.id || optionIds.has(option.id)) throw new Error(`Duplicate/missing option id in ${event.id}`);
    optionIds.add(option.id);
    if (!archetypeIds.has(option.archetypeId)) throw new Error(`Unknown archetype ${option.archetypeId} in ${event.id}/${option.id}`);
    if (!option.check || !option.check.primary || typeof option.check.difficulty !== 'number') {
      throw new Error(`Missing check in ${event.id}/${option.id}`);
    }
    if (option.hiddenBranch && option.hiddenBranch.internalTrueName) {
      throw new Error(`Option ${event.id}/${option.id} contains forbidden internalTrueName`);
    }
  }
}

for (const rule of hidden) {
  if (!rule.id || !rule.type || !rule.visibleHint) throw new Error(`Invalid hidden rule ${rule.id}`);
  if (rule.internalTrueName) throw new Error(`Hidden rule ${rule.id} should not expose internalTrueName`);
}

console.log(`Major choice v0.2 validation passed: ${events.length} events, ${archetypes.length} archetypes, ${hidden.length} hidden branch rules.`);
