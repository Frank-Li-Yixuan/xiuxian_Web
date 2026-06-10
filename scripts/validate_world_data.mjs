import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || path.resolve(process.cwd(), 'data/world');
const files = [
  'world_regions.v0.1.json',
  'world_factions.v0.1.json',
  'world_event_rules.v0.1.json',
  'world_glossary.v0.1.json'
];

let ok = true;
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.error(`Missing ${p}`);
    ok = false;
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON ${p}:`, err.message);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log(`World data validation passed: ${files.length} files.`);
