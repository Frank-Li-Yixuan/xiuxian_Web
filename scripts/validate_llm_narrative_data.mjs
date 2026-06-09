import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const dir = path.join(root, 'data', 'llm_narrative');
const required = [
  'narrative_task_definitions.v0.1.json',
  'output_schemas.v0.1.json',
  'forbidden_terms.v0.1.json',
  'sanitization_rules.v0.1.json',
  'fallback_templates.v0.1.json',
  'prompt_templates.v0.1.json',
  'cache_rules.v0.1.json',
  'sample_requests.v0.1.json'
];
for (const file of required) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
  JSON.parse(fs.readFileSync(full, 'utf8'));
}
const tasks = JSON.parse(fs.readFileSync(path.join(dir,'narrative_task_definitions.v0.1.json'),'utf8')).tasks;
if (!Array.isArray(tasks) || tasks.length < 8) throw new Error('Expected at least 8 narrative tasks');
const forbidden = JSON.parse(fs.readFileSync(path.join(dir,'forbidden_terms.v0.1.json'),'utf8'));
if (!forbidden.hiddenTrueNames?.length) throw new Error('Missing hidden true names');
console.log(`LLM narrative data validation passed: ${tasks.length} tasks, ${forbidden.hiddenTrueNames.length} hidden forbidden terms.`);
