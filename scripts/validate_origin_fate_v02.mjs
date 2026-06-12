#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = 'data/origin_fate_v02';
const supportedVersion = '0.2';

const fileNames = {
  hiddenFates: 'hidden_fate_definitions.v0.2.json',
  origins: 'origin_storyline_definitions.v0.2.json',
  carriedItems: 'carried_item_narrative_chains.v0.2.json',
  reveal: 'reveal_stage_rules.v0.2.json',
  omenPhrases: 'omen_phrase_bank.v0.2.json',
  synergies: 'origin_item_hidden_synergy_rules.v0.2.json'
};

const requiredLifecycleStages = ['obtained', 'noticed', 'converted'];
const legalSynergyEffectTypes = new Set(['progressBonus', 'itemAffinityBonus', 'unlockThread', 'riskBonus', 'age18Hook']);

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`missing file: ${rel}`);
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (error) {
    throw new Error(`invalid JSON in ${rel}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function main() {
  const issues = [];
  let data;
  try {
    data = {
      hiddenFates: readJson(path.join(dataDir, fileNames.hiddenFates)),
      origins: readJson(path.join(dataDir, fileNames.origins)),
      carriedItems: readJson(path.join(dataDir, fileNames.carriedItems)),
      reveal: readJson(path.join(dataDir, fileNames.reveal)),
      omenPhrases: readJson(path.join(dataDir, fileNames.omenPhrases)),
      synergies: readJson(path.join(dataDir, fileNames.synergies))
    };
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    finish(issues);
    return;
  }

  const hiddenFateIds = validateHiddenFates(data.hiddenFates, issues);
  const originIds = validateOrigins(data.origins, hiddenFateIds, issues);
  const itemIds = validateCarriedItems(data.carriedItems, hiddenFateIds, issues);
  const revealBandIds = validateRevealRules(data.reveal, hiddenFateIds, issues);
  validateOmenPhrases(data.omenPhrases, data.hiddenFates, issues);
  validateHiddenFateReferences(data.hiddenFates, itemIds, revealBandIds, issues);
  validateSynergies(data.synergies, originIds, itemIds, hiddenFateIds, issues);

  finish(issues, data);
}

function validateHiddenFates(hiddenFates, issues) {
  const ids = new Set();
  const items = requireNonEmptyArray('hidden_fate_definitions', hiddenFates, issues);
  for (const [index, fate] of items.entries()) {
    const base = `hidden_fate_definitions[${index}]`;
    validateUniqueId(`${base}.id`, fate?.id, ids, 'hidden fate id', issues);
    validateNonEmptyString(`${base}.trueName`, fate?.trueName, issues);
    validateNonEmptyString(`${base}.publicAlias`, fate?.publicAlias, issues);
    validateStringArray(`${base}.primaryTags`, fate?.primaryTags, issues);
    validateStringArray(`${base}.antiTags`, fate?.antiTags, issues);
    validateStringArray(`${base}.preferredOrigins`, fate?.preferredOrigins, issues);
    validateStringArray(`${base}.preferredRoots`, fate?.preferredRoots, issues);
    validateStringArray(`${base}.preferredDestinies`, fate?.preferredDestinies, issues);
    validateStringArray(`${base}.preferredItems`, fate?.preferredItems, issues);
    validateStringArray(`${base}.misleadingOmenIds`, fate?.misleadingOmenIds, issues);
    validateStringArray(`${base}.lifeEventHooks`, fate?.lifeEventHooks, issues);
    validateStringArray(`${base}.majorChoiceHooks`, fate?.majorChoiceHooks, issues);
    validateStringArray(`${base}.interludeHooks`, fate?.interludeHooks, issues);
    validateStringArray(`${base}.stageTransitionTokens`, fate?.stageTransitionTokens, issues);
    validateStringArray(`${base}.age18Outcomes`, fate?.age18Outcomes, issues);

    const stages = requireNonEmptyArray(`${base}.omenStages`, fate?.omenStages, issues);
    if (stages.length < 2) {
      issues.push(`${base}.omenStages must contain at least 2 entries`);
    }
    for (const [stageIndex, stage] of stages.entries()) {
      validateNonEmptyString(`${base}.omenStages[${stageIndex}].band`, stage?.band, issues);
      validateNonEmptyString(`${base}.omenStages[${stageIndex}].text`, stage?.text, issues);
      if (isNonEmptyString(fate?.trueName) && isNonEmptyString(stage?.text) && stage.text.includes(fate.trueName)) {
        issues.push(`${base}.omenStages[${stageIndex}].text leaks hidden trueName`);
      }
    }
  }
  return ids;
}

function validateOrigins(origins, hiddenFateIds, issues) {
  const ids = new Set();
  const items = requireNonEmptyArray('origin_storyline_definitions', origins, issues);
  for (const [index, origin] of items.entries()) {
    const base = `origin_storyline_definitions[${index}]`;
    validateUniqueId(`${base}.id`, origin?.id, ids, 'origin id', issues);
    validateNonEmptyString(`${base}.name`, origin?.name, issues);
    validateStringArray(`${base}.regionTags`, origin?.regionTags, issues);
    validateNonEmptyString(`${base}.narrativeTheme`, origin?.narrativeTheme, issues);
    validateStringArray(`${base}.storylineBias`, origin?.storylineBias, issues);
    validateStringArray(`${base}.earlyEchoEvents`, origin?.earlyEchoEvents, issues);
    validateStringArray(`${base}.childhoodSeedEvents`, origin?.childhoodSeedEvents, issues);
    validateStringArray(`${base}.youthConflictEvents`, origin?.youthConflictEvents, issues);
    validateStringArray(`${base}.teenChoiceEvents`, origin?.teenChoiceEvents, issues);
    validateStringArray(`${base}.hiddenFateBias`, origin?.hiddenFateBias, issues);
    validateStringArray(`${base}.carriedItemBias`, origin?.carriedItemBias, issues);
    validateStringArray(`${base}.interludeBias`, origin?.interludeBias, issues);
    if (!Array.isArray(origin?.storylineBias) || origin.storylineBias.length === 0) {
      issues.push(`${base}.storylineBias must contain at least one entry`);
    }
    if (!Array.isArray(origin?.carriedItemBias) || origin.carriedItemBias.length === 0) {
      issues.push(`${base}.carriedItemBias must contain at least one entry`);
    }
    validateReferenceArray(`${base}.hiddenFateBias`, origin?.hiddenFateBias, hiddenFateIds, 'hidden fate id', issues);
  }
  return ids;
}

function validateCarriedItems(carriedItems, hiddenFateIds, issues) {
  const ids = new Set();
  const items = requireNonEmptyArray('carried_item_narrative_chains', carriedItems, issues);
  for (const [index, item] of items.entries()) {
    const base = `carried_item_narrative_chains[${index}]`;
    validateUniqueId(`${base}.id`, item?.id, ids, 'carried item id', issues);
    validateNonEmptyString(`${base}.name`, item?.name, issues);
    validateNonEmptyString(`${base}.surfaceDescription`, item?.surfaceDescription, issues);
    validateStringArray(`${base}.preferredOrigins`, item?.preferredOrigins, issues);
    validateStringArray(`${base}.preferredHiddenFates`, item?.preferredHiddenFates, issues);
    validateStringArray(`${base}.preferredDestinies`, item?.preferredDestinies, issues);
    validateStringArray(`${base}.eventHooks`, item?.eventHooks, issues);
    validateStringArray(`${base}.interludeHooks`, item?.interludeHooks, issues);
    validateStringArray(`${base}.age18Conversions`, item?.age18Conversions, issues);
    validateStringArray(`${base}.dongfuHooks`, item?.dongfuHooks, issues);
    validateReferenceArray(`${base}.preferredHiddenFates`, item?.preferredHiddenFates, hiddenFateIds, 'hidden fate id', issues);

    const lifecycle = requireNonEmptyArray(`${base}.lifecycle`, item?.lifecycle, issues);
    const stages = new Set(lifecycle.map((entry) => entry?.stage));
    for (const stage of requiredLifecycleStages) {
      if (!stages.has(stage)) {
        issues.push(`${base}.lifecycle missing required stage: ${stage}`);
      }
    }
    for (const [entryIndex, entry] of lifecycle.entries()) {
      validateNonEmptyString(`${base}.lifecycle[${entryIndex}].stage`, entry?.stage, issues);
      validateNonEmptyString(`${base}.lifecycle[${entryIndex}].text`, entry?.text, issues);
    }
  }
  return ids;
}

function validateRevealRules(reveal, hiddenFateIds, issues) {
  validateVersion('reveal_stage_rules', reveal?.version, issues);
  const ids = new Set();
  const bands = requireNonEmptyArray('reveal_stage_rules.progressBands', reveal?.progressBands, issues);
  let previousMax;
  for (const [index, band] of bands.entries()) {
    const base = `reveal_stage_rules.progressBands[${index}]`;
    validateUniqueId(`${base}.id`, band?.id, ids, 'reveal band id', issues);
    validateFiniteNumber(`${base}.min`, band?.min, issues);
    validateFiniteNumber(`${base}.max`, band?.max, issues);
    validateNonEmptyString(`${base}.uiLabel`, band?.uiLabel, issues);
    if (typeof band?.canShowTrueName !== 'boolean') {
      issues.push(`${base}.canShowTrueName must be a boolean`);
    }
    if (Number.isFinite(band?.min) && Number.isFinite(band?.max) && band.min > band.max) {
      issues.push(`${base}.min must be <= max`);
    }
    if (previousMax !== undefined && Number.isFinite(band?.min) && band.min <= previousMax) {
      issues.push(`${base} overlaps previous reveal band`);
    }
    if (Number.isFinite(band?.max)) {
      previousMax = band.max;
    }
  }

  if (typeof reveal?.revealPolicies !== 'object' || reveal.revealPolicies === null) {
    issues.push('reveal_stage_rules.revealPolicies must exist');
  } else {
    for (const [policyId, policy] of Object.entries(reveal.revealPolicies)) {
      const base = `reveal_stage_rules.revealPolicies.${policyId}`;
      if (typeof policy?.allowTrueName !== 'boolean') {
        issues.push(`${base}.allowTrueName must be a boolean`);
      }
      if (typeof policy?.allowExactProgress !== 'boolean') {
        issues.push(`${base}.allowExactProgress must be a boolean`);
      }
    }
  }

  const ruleIds = new Set();
  const rules = requireNonEmptyArray('reveal_stage_rules.misdirectionRules', reveal?.misdirectionRules, issues);
  for (const [index, rule] of rules.entries()) {
    const base = `reveal_stage_rules.misdirectionRules[${index}]`;
    validateUniqueId(`${base}.id`, rule?.id, ruleIds, 'misdirection rule id', issues);
    validateStringArray(`${base}.signals`, rule?.signals, issues);
    validateStringArray(`${base}.possibleTruths`, rule?.possibleTruths, issues);
    for (const [truthIndex, truth] of (rule?.possibleTruths ?? []).entries()) {
      if (isNonEmptyString(truth) && truth.startsWith('hidden_') && !hiddenFateIds.has(truth)) {
        issues.push(`${base}.possibleTruths[${truthIndex}] references missing hidden fate id: ${truth}`);
      }
    }
  }
  return ids;
}

function validateOmenPhrases(omenBank, hiddenFates, issues) {
  validateVersion('omen_phrase_bank', omenBank?.version, issues);
  const trueNames = Array.isArray(hiddenFates) ? hiddenFates.map((fate) => fate?.trueName).filter(isNonEmptyString) : [];
  const ids = new Set();
  const phrases = requireNonEmptyArray('omen_phrase_bank.phrases', omenBank?.phrases, issues);
  for (const [index, phrase] of phrases.entries()) {
    const base = `omen_phrase_bank.phrases[${index}]`;
    validateUniqueId(`${base}.id`, phrase?.id, ids, 'omen phrase id', issues);
    validateStringArray(`${base}.tags`, phrase?.tags, issues);
    validateNonEmptyString(`${base}.text`, phrase?.text, issues);
    if (isNonEmptyString(phrase?.text) && trueNames.some((trueName) => phrase.text.includes(trueName))) {
      issues.push(`${base}.text leaks hidden trueName`);
    }
  }
  return ids;
}

function validateHiddenFateReferences(hiddenFates, itemIds, revealBandIds, issues) {
  if (!Array.isArray(hiddenFates)) {
    return;
  }
  for (const [index, fate] of hiddenFates.entries()) {
    const base = `hidden_fate_definitions[${index}]`;
    validateReferenceArray(`${base}.preferredItems`, fate?.preferredItems, itemIds, 'carried item id', issues);
    for (const [stageIndex, stage] of (fate?.omenStages ?? []).entries()) {
      if (isNonEmptyString(stage?.band) && !revealBandIds.has(stage.band)) {
        issues.push(`${base}.omenStages[${stageIndex}].band references unknown reveal band: ${stage.band}`);
      }
    }
  }
}

function validateSynergies(synergies, originIds, itemIds, hiddenFateIds, issues) {
  validateVersion('origin_item_hidden_synergy_rules', synergies?.version, issues);
  const ids = new Set();
  const rules = requireNonEmptyArray('origin_item_hidden_synergy_rules.rules', synergies?.rules, issues);
  for (const [index, rule] of rules.entries()) {
    const base = `origin_item_hidden_synergy_rules.rules[${index}]`;
    validateUniqueId(`${base}.id`, rule?.id, ids, 'synergy rule id', issues);
    validateReference(`${base}.originId`, rule?.originId, originIds, 'origin id', issues);
    validateReference(`${base}.itemId`, rule?.itemId, itemIds, 'carried item id', issues);
    validateReference(`${base}.hiddenFateId`, rule?.hiddenFateId, hiddenFateIds, 'hidden fate id', issues);
    const effects = requireNonEmptyArray(`${base}.effects`, rule?.effects, issues);
    for (const [effectIndex, effect] of effects.entries()) {
      const effectBase = `${base}.effects[${effectIndex}]`;
      if (!legalSynergyEffectTypes.has(String(effect?.type))) {
        issues.push(`${effectBase}.type is not legal: ${String(effect?.type)}`);
      }
      validateNonEmptyString(`${effectBase}.target`, effect?.target, issues);
      if (effect?.value !== undefined) {
        validateFiniteNumber(`${effectBase}.value`, effect.value, issues);
      }
      if (effect?.type === 'progressBonus') {
        validateReference(`${effectBase}.target`, effect.target, hiddenFateIds, 'hidden fate id', issues);
      }
      if (effect?.type === 'itemAffinityBonus') {
        validateReference(`${effectBase}.target`, effect.target, itemIds, 'carried item id', issues);
      }
    }
  }
}

function requireNonEmptyArray(pathLabel, value, issues) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${pathLabel} must contain at least one item`);
    return [];
  }
  return value;
}

function validateVersion(pathLabel, version, issues) {
  if (version !== supportedVersion) {
    issues.push(`${pathLabel}.version must be ${supportedVersion}`);
  }
}

function validateUniqueId(pathLabel, value, ids, label, issues) {
  if (!isNonEmptyString(value)) {
    issues.push(`${pathLabel} must not be empty`);
    return;
  }
  if (ids.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return;
  }
  ids.add(value);
}

function validateNonEmptyString(pathLabel, value, issues) {
  if (!isNonEmptyString(value)) {
    issues.push(`${pathLabel} must not be empty`);
  }
}

function validateStringArray(pathLabel, value, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${pathLabel} must be an array`);
    return;
  }
  for (const [index, entry] of value.entries()) {
    if (!isNonEmptyString(entry)) {
      issues.push(`${pathLabel}[${index}] must not be empty`);
    }
  }
}

function validateReferenceArray(pathLabel, values, legalIds, label, issues) {
  if (!Array.isArray(values)) {
    return;
  }
  for (const [index, value] of values.entries()) {
    if (isNonEmptyString(value) && !legalIds.has(value)) {
      issues.push(`${pathLabel}[${index}] references missing ${label}: ${value}`);
    }
  }
}

function validateReference(pathLabel, value, legalIds, label, issues) {
  if (!isNonEmptyString(value)) {
    issues.push(`${pathLabel} must not be empty`);
    return;
  }
  if (!legalIds.has(value)) {
    issues.push(`${pathLabel} references missing ${label}: ${value}`);
  }
}

function validateFiniteNumber(pathLabel, value, issues) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(`${pathLabel} must be a finite number`);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function finish(issues, data) {
  if (issues.length > 0) {
    console.error('Origin fate v0.2 validation failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `Origin fate v0.2 validation passed: 6 files, ${data.hiddenFates.length} hidden fates, ${data.origins.length} origins, ${data.carriedItems.length} carried items, ${data.reveal.progressBands.length} reveal bands, ${data.omenPhrases.phrases.length} omen phrases, ${data.synergies.rules.length} synergy rules.`
  );
}

main();
