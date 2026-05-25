import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const destinyDir = path.join(root, 'data', 'destiny');
const traitsPath = path.join(destinyDir, 'destiny_traits.v0.1.json');
const rulesPath = path.join(destinyDir, 'conflict_synergy_rules.v0.1.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const traits = readJson(traitsPath).traits;
const rules = readJson(rulesPath);
const ids = new Set();
let ok = true;
for (const t of traits) {
  if (ids.has(t.id)) {
    console.error('Duplicate trait id:', t.id);
    ok = false;
  }
  ids.add(t.id);
  if (!Array.isArray(t.slotTypes) || t.slotTypes.length === 0) {
    console.error('Missing slotTypes:', t.id);
    ok = false;
  }
  if (t.slotTypes.includes('flaw') && !t.calamitySeverity) {
    console.error('Flaw missing calamitySeverity:', t.id);
    ok = false;
  }
}
function checkRuleList(list, kind) {
  for (const r of list ?? []) {
    for (const id of r.traits ?? []) {
      if (!ids.has(id)) {
        console.error(`${kind} references missing trait:`, r.id, id);
        ok = false;
      }
    }
  }
}
checkRuleList(rules.exclusiveRules, 'exclusive');
checkRuleList(rules.synergyRules, 'synergy');
if (!ok) process.exit(1);
console.log(`Destiny data OK. traits=${traits.length}`);
