#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = path.join(root, "data", "life_sim");
const fallbackBase = path.join(root, "xiuxian_life_monthly_events_v0_1", "data", "life_sim");
const dataBase = fs.existsSync(base) ? base : fallbackBase;

function readJson(file) {
  const p = path.join(dataBase, file);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const categories = readJson("monthly_event_categories.v0.1.json");
const phases = readJson("phase_definitions.v0.1.json");
const eventsData = readJson("monthly_events.v0.1.json");

const categoryIds = new Set(categories.categories.map(c => c.id));
const phaseCounts = new Map(phases.phases.map(p => [p.id, 0]));
const validEffectKinds = new Set([
  "core","aptitudeSoft","lifeSkill","merit","karma","state","hiddenFateProgress",
  "itemAffinity","destinyProgress","majorChoiceHook","age18Hook","modeBias","dongfuHook","tag","lifeEventBias"
]);
const validConditionKinds = new Set([
  "tagAny","tagAll","statAbove","statBelow","statAnyAbove","stateFlag","hiddenFateBandAtLeast"
]);

const ids = new Set();
const errors = [];

function phaseForAgeRange(range) {
  return phases.phases.filter(p => !(range[1] < p.ageRangeMonths[0] || range[0] > p.ageRangeMonths[1])).map(p => p.id);
}

for (const ev of eventsData.events) {
  if (!ev.id) errors.push(`Missing id`);
  if (ids.has(ev.id)) errors.push(`Duplicate event id: ${ev.id}`);
  ids.add(ev.id);

  if (!categoryIds.has(ev.category)) errors.push(`${ev.id}: unknown category ${ev.category}`);
  if (!Array.isArray(ev.ageRangeMonths) || ev.ageRangeMonths.length !== 2 || ev.ageRangeMonths[0] > ev.ageRangeMonths[1]) {
    errors.push(`${ev.id}: invalid ageRangeMonths`);
  } else {
    for (const pid of phaseForAgeRange(ev.ageRangeMonths)) {
      phaseCounts.set(pid, (phaseCounts.get(pid) ?? 0) + 1);
    }
  }
  if (typeof ev.baseWeight !== "number" || ev.baseWeight <= 0) errors.push(`${ev.id}: baseWeight must be > 0`);
  if (typeof ev.cooldownMonths !== "number" || ev.cooldownMonths < 0) errors.push(`${ev.id}: cooldownMonths must be >= 0`);

  for (const eff of [...(ev.visibleEffects ?? []), ...(ev.hiddenEffects ?? [])]) {
    if (!validEffectKinds.has(eff.kind)) errors.push(`${ev.id}: invalid effect kind ${eff.kind}`);
    if (typeof eff.target !== "string") errors.push(`${ev.id}: effect missing target`);
    if (typeof eff.value !== "number") errors.push(`${ev.id}: effect missing numeric value`);
  }

  for (const cond of ev.conditions ?? []) {
    if (!validConditionKinds.has(cond.kind)) errors.push(`${ev.id}: invalid condition kind ${cond.kind}`);
  }

  const leakTerms = ["古雷真血", "丹圣遗骨", "太阴残脉", "前世剑魄", "系统共鸣体"];
  for (const term of leakTerms) {
    if ((ev.description ?? "").includes(term)) {
      errors.push(`${ev.id}: description leaks hidden fate true name ${term}`);
    }
  }
}

if (eventsData.events.length < 60) errors.push(`Need at least 60 monthly events, got ${eventsData.events.length}`);

for (const [phaseId, count] of phaseCounts.entries()) {
  if (count < 12) errors.push(`Phase ${phaseId} has too few events: ${count}`);
}

if (errors.length) {
  console.error("Life event data validation failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Life event data validation passed: ${eventsData.events.length} events, ${categoryIds.size} categories, ${phases.phases.length} phases.`);
