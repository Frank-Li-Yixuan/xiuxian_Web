#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}
const files = [
  'data/life_playable/first_playable_flow.v0.1.json',
  'data/life_playable/pacing_budgets.v0.1.json',
  'data/life_playable/ui_state_machine.v0.1.json',
  'data/life_playable/content_minimums.v0.1.json',
  'data/life_playable/sample_playthroughs.v0.1.json',
  'data/life_playable/telemetry_targets.v0.1.json'
];
for (const f of files) {
  const data = readJson(f);
  if (!data.version) throw new Error(`${f} missing version`);
}
const flow = readJson(files[0]);
if (!Array.isArray(flow.stages) || flow.stages.length < 5) throw new Error('flow must define stages');
const pacing = readJson(files[1]);
if (!pacing.durationTargetsMinutes?.firstPlay) throw new Error('missing duration target');
const ui = readJson(files[2]);
if (!ui.states.includes('major_choice_pending')) throw new Error('ui state missing major_choice_pending');
const min = readJson(files[3]);
if (min.mustHave.monthlyEventPoolMinimum < 80) throw new Error('monthly event minimum too low');
console.log('Life simulation first playable data validation passed:', files.length, 'files.');
