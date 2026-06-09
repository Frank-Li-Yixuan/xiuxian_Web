#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const hidden = readJson('data/origin_fate_v02/hidden_fate_definitions.v0.2.json');
const origins = readJson('data/origin_fate_v02/origin_storyline_definitions.v0.2.json');
const items = readJson('data/origin_fate_v02/carried_item_narrative_chains.v0.2.json');
const reveal = readJson('data/origin_fate_v02/reveal_stage_rules.v0.2.json');

function fail(msg) {
  console.error('Validation failed:', msg);
  process.exit(1);
}

const hiddenIds = new Set();
for (const h of hidden) {
  if (!h.id || !h.trueName || !h.publicAlias) fail('hidden fate missing id/trueName/publicAlias');
  if (hiddenIds.has(h.id)) fail('duplicate hidden fate id ' + h.id);
  hiddenIds.add(h.id);
  if (!Array.isArray(h.omenStages) || h.omenStages.length < 2) fail(h.id + ' must have at least 2 omen stages');
  for (const o of h.omenStages) {
    if (o.text.includes(h.trueName)) fail(h.id + ' omen leaks trueName');
  }
  if (!Array.isArray(h.age18Outcomes) || h.age18Outcomes.length === 0) fail(h.id + ' missing age18 outcomes');
}

const originIds = new Set();
for (const o of origins) {
  if (!o.id || !o.name) fail('origin missing id/name');
  if (originIds.has(o.id)) fail('duplicate origin id ' + o.id);
  originIds.add(o.id);
  if (!Array.isArray(o.storylineBias) || o.storylineBias.length === 0) fail(o.id + ' missing storylineBias');
  if (!Array.isArray(o.carriedItemBias) || o.carriedItemBias.length === 0) fail(o.id + ' missing carriedItemBias');
}

const itemIds = new Set();
for (const item of items) {
  if (!item.id || !item.name) fail('item missing id/name');
  if (itemIds.has(item.id)) fail('duplicate item id ' + item.id);
  itemIds.add(item.id);
  const stages = new Set((item.lifecycle || []).map(s => s.stage));
  for (const needed of ['obtained','noticed','converted']) {
    if (!stages.has(needed)) fail(item.id + ' missing lifecycle stage ' + needed);
  }
  if (!Array.isArray(item.age18Conversions) || item.age18Conversions.length === 0) fail(item.id + ' missing age18 conversions');
}

for (const band of reveal.progressBands || []) {
  if (typeof band.canShowTrueName !== 'boolean') fail('reveal band missing canShowTrueName boolean');
}

console.log(`Origin fate v0.2 validation passed: ${hidden.length} hidden fates, ${origins.length} origins, ${items.length} items.`);
