import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const dataDir = path.join(root, 'data', 'origin_fate');

function readJson(name) {
  const full = path.join(dataDir, name);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function uniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    assert(item.id && typeof item.id === 'string', `${label} missing id`);
    assert(!seen.has(item.id), `${label} duplicate id: ${item.id}`);
    seen.add(item.id);
  }
}

const origins = readJson('background_origins.v0.1.json').origins;
const hidden = readJson('hidden_fates.v0.1.json').hiddenFates;
const items = readJson('carried_items.v0.1.json').items;
const rules = readJson('generation_rules.v0.1.json');
const reveal = readJson('reveal_rules.v0.1.json');

uniqueIds(origins, 'origin');
uniqueIds(hidden, 'hiddenFate');
uniqueIds(items, 'carriedItem');

for (const origin of origins) {
  assert(origin.baseWeight > 0, `origin ${origin.id} baseWeight must be > 0`);
  assert(origin.visibleDescription?.length > 10, `origin ${origin.id} needs visibleDescription`);
  assert(Array.isArray(origin.lifeEventBiasTags) && origin.lifeEventBiasTags.length > 0, `origin ${origin.id} needs lifeEventBiasTags`);
  assert(Array.isArray(origin.hiddenFateBiasTags), `origin ${origin.id} needs hiddenFateBiasTags`);
  assert(Array.isArray(origin.carriedItemBiasTags), `origin ${origin.id} needs carriedItemBiasTags`);
}

for (const hf of hidden) {
  assert(hf.baseWeight > 0, `hiddenFate ${hf.id} baseWeight must be > 0`);
  assert(hf.trueName?.length > 0, `hiddenFate ${hf.id} needs trueName`);
  assert(Array.isArray(hf.omenHints) && hf.omenHints.length >= 2, `hiddenFate ${hf.id} needs at least 2 omenHints`);
  assert(hf.visibleRiskHint?.length > 0, `hiddenFate ${hf.id} needs visibleRiskHint`);
  assert(hf.initialProgressRange?.length === 2, `hiddenFate ${hf.id} needs initialProgressRange`);
  assert(hf.revealThresholds?.hintOnly === 0, `hiddenFate ${hf.id} revealThresholds.hintOnly must be 0`);
  assert(hf.revealThresholds?.awakened === 100, `hiddenFate ${hf.id} revealThresholds.awakened must be 100`);
  assert(Array.isArray(hf.outerBattlefieldEffects) && hf.outerBattlefieldEffects.length > 0, `hiddenFate ${hf.id} needs outerBattlefieldEffects`);
  assert(Array.isArray(hf.dongfuHooks) && hf.dongfuHooks.length > 0, `hiddenFate ${hf.id} needs dongfuHooks`);
}

for (const item of items) {
  assert(item.baseWeight > 0, `carriedItem ${item.id} baseWeight must be > 0`);
  assert(item.visibleDescription?.length > 5, `carriedItem ${item.id} needs visibleDescription`);
  assert(item.eighteenConversion?.type, `carriedItem ${item.id} needs eighteenConversion.type`);
  assert(item.eighteenConversion?.outerBattlefieldEffect, `carriedItem ${item.id} needs outerBattlefieldEffect`);
  assert(item.eighteenConversion?.dongfuHook, `carriedItem ${item.id} needs dongfuHook`);
}

assert(rules.hiddenFate?.displayPolicy === 'show_omen_only', 'hiddenFate displayPolicy must be show_omen_only');
assert(reveal.uiTextRules?.forbiddenAtCreation?.includes('trueName'), 'reveal rules must forbid trueName at creation');

console.log(JSON.stringify({ ok: true, origins: origins.length, hiddenFates: hidden.length, carriedItems: items.length }, null, 2));
