import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "data/fate_matrix/nine_attributes.v0.1.json",
  "data/fate_matrix/three_powers_yinyang_wuxing.v0.1.json",
  "data/fate_matrix/destiny_eligibility_rules.v0.1.json",
  "data/fate_matrix/attribute_correlation_rules.v0.1.json",
  "data/fate_matrix/attribute_event_bias_rules.v0.1.json",
  "data/fate_matrix/generation_algorithm_upgrade_rules.v0.1.json"
];

let ok = true;
for (const rel of files) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`Missing: ${rel}`);
    ok = false;
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    console.error(`Invalid JSON: ${rel}`);
    console.error(err);
    ok = false;
  }
}

if (!ok) process.exit(1);

const traits = JSON.parse(fs.readFileSync(path.join(root, "data/fate_matrix/destiny_eligibility_rules.v0.1.json"), "utf8")).traits;
const ids = new Set();
for (const t of traits) {
  if (!t.id || !t.name) {
    console.error("Trait missing id/name", t);
    ok = false;
  }
  if (ids.has(t.id)) {
    console.error("Duplicate trait id", t.id);
    ok = false;
  }
  ids.add(t.id);
  if (t.ifContradictedMutateTo && !traits.some(x => x.id === t.ifContradictedMutateTo)) {
    console.error(`Missing mutation target ${t.ifContradictedMutateTo} for ${t.id}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log(`Nine palace data validation passed: ${traits.length} destiny eligibility entries.`);
