#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = path.join(root, "data", "opening");
const fallback = path.join(root, "xiuxian_opening_attribute_root_generator_v0_1", "data", "opening");

function readJson(file) {
  const p1 = path.join(base, file);
  const p2 = path.join(fallback, file);
  const p = fs.existsSync(p1) ? p1 : p2;
  if (!fs.existsSync(p)) throw new Error(`Missing ${file}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const archetypes = readJson("attribute_archetypes.v0.1.json");
const roots = readJson("spiritual_roots.v0.1.json");
const weights = readJson("root_element_weights.v0.1.json");
const rules = readJson("generation_rules.v0.1.json");

let errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

assert(Array.isArray(archetypes.archetypes), "archetypes must be array");
for (const a of archetypes.archetypes) {
  assert(a.id && a.name, `archetype missing id/name`);
  assert(a.weight > 0, `${a.id} weight must be >0`);
  for (const [k, range] of Object.entries(a.aptitudeRanges ?? {})) {
    assert(Array.isArray(range) && range.length === 2, `${a.id}.${k} range invalid`);
    assert(range[0] <= range[1], `${a.id}.${k} min > max`);
    assert(range[0] >= 1 && range[1] <= 120, `${a.id}.${k} out of domain`);
  }
}

const elementIds = new Set((roots.elements ?? []).map(e => e.id));
assert(elementIds.size >= 7, "expected at least seven element ids");
for (const c of roots.rootCategories ?? []) {
  assert(c.id && c.name, `root category missing id/name`);
  assert(c.weight > 0, `${c.id} weight must be >0`);
  assert(Array.isArray(c.elementCount) && c.elementCount.length === 2, `${c.id} elementCount invalid`);
  for (const [metric, range] of Object.entries(c.metricRanges ?? {})) {
    assert(Array.isArray(range) && range.length === 2, `${c.id}.${metric} metric range invalid`);
    assert(range[0] <= range[1], `${c.id}.${metric} min > max`);
    assert(range[0] >= 0 && range[1] <= 120, `${c.id}.${metric} out of domain`);
  }
  for (const e of c.allowedElements ?? []) assert(elementIds.has(e), `${c.id} allowed element ${e} missing`);
}

for (const relType of ["generating", "controlling"]) {
  for (const pair of weights.relationships?.[relType] ?? []) {
    assert(elementIds.has(pair[0]), `${relType} missing element ${pair[0]}`);
    assert(elementIds.has(pair[1]), `${relType} missing element ${pair[1]}`);
  }
}
for (const rel of weights.relationships?.special ?? []) {
  for (const e of rel.pair ?? []) assert(elementIds.has(e), `special relation missing element ${e}`);
}

assert(rules.statDomains.aptitudeMin >= 1, "aptitudeMin invalid");
assert(rules.statDomains.aptitudeHardMax <= 120, "aptitudeHardMax invalid");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Opening data valid: ${archetypes.archetypes.length} archetypes, ${roots.rootCategories.length} root categories, ${elementIds.size} elements.`);
