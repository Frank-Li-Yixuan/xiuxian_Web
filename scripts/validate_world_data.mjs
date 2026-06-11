import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || path.resolve(process.cwd(), "data/world");
const files = {
  regions: "world_regions.v0.1.json",
  factions: "world_factions.v0.1.json",
  eventRules: "world_event_rules.v0.1.json",
  glossary: "world_glossary.v0.1.json"
};

const supportedVersion = "0.1";
const legalLifePhases = new Set(["infancy", "childhood", "youth", "adolescence", "awakening"]);
const legalTruthLevels = new Set(["mundane", "anomalous", "dream", "trial", "combat", "system_omen"]);
const legalGameplayInterludes = new Set([
  "none",
  "stg_short_dream",
  "stg_short",
  "stg",
  "horde_short",
  "horde",
  "deckbuilder_trial",
  "deckbuilder",
  "autochess_trial",
  "autochess"
]);

const issues = [];
const data = {};

for (const [key, fileName] of Object.entries(files)) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    issues.push(`${fileName}:file: missing required WORLD data file at ${filePath}`);
    continue;
  }
  try {
    data[key] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    issues.push(`${fileName}:json: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (data.regions !== undefined) {
  validateRegions(data.regions);
}
if (data.factions !== undefined) {
  validateFactions(data.factions);
}
if (data.eventRules !== undefined) {
  validateEventRules(data.eventRules);
}
if (data.glossary !== undefined) {
  validateGlossary(data.glossary);
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(issue);
  }
  process.exit(1);
}

console.log(
  `World data validation passed: ${Object.keys(files).length} files, layers=${data.regions.layers.length}, regions=${data.regions.regions.length}, locations=${data.regions.locations.length}, factions=${data.factions.factions.length}, truthLevels=${data.eventRules.truthLevels.length}, ageRestrictions=${data.eventRules.ageRestrictions.length}, forbiddenTerms=${data.eventRules.forbiddenModernTerms.length}.`
);

function validateRegions(regionsData) {
  validateVersion(files.regions, regionsData.version);
  nonEmptyString(files.regions, "worldId", regionsData.worldId);
  nonEmptyString(files.regions, "worldName", regionsData.worldName);
  nonEmptyString(files.regions, "startingRegionId", regionsData.startingRegionId);

  const layerIds = new Set();
  const layers = nonEmptyArray(files.regions, "layers", regionsData.layers);
  layers.forEach((layer, index) => {
    const prefix = `layers[${index}]`;
    uniqueId(files.regions, `${prefix}.id`, layer?.id, layerIds, "world layer id");
    nonEmptyString(files.regions, `${prefix}.name`, layer?.name);
    nonEmptyString(files.regions, `${prefix}.description`, layer?.description);
    if (typeof layer?.earlyLifeAllowed !== "boolean") {
      issue(files.regions, `${prefix}.earlyLifeAllowed`, "must be a boolean");
    }
  });

  const regionIds = new Set();
  const regions = nonEmptyArray(files.regions, "regions", regionsData.regions);
  regions.forEach((region, index) => {
    const prefix = `regions[${index}]`;
    uniqueId(files.regions, `${prefix}.id`, region?.id, regionIds, "world region id");
    nonEmptyString(files.regions, `${prefix}.name`, region?.name);
    if (region?.parent !== undefined) {
      nonEmptyString(files.regions, `${prefix}.parent`, region.parent);
    }
    stringArray(files.regions, `${prefix}.tags`, region?.tags);
    nonEmptyString(files.regions, `${prefix}.description`, region?.description);
  });

  regions.forEach((region, index) => {
    if (typeof region?.parent === "string" && region.parent.startsWith("region_") && !regionIds.has(region.parent)) {
      issue(files.regions, `regions[${index}].parent`, `references unknown region: ${region.parent}`);
    }
  });

  if (typeof regionsData.startingRegionId === "string" && !regionIds.has(regionsData.startingRegionId)) {
    issue(files.regions, "startingRegionId", `references unknown region: ${regionsData.startingRegionId}`);
  }

  const locationIds = new Set();
  const locations = nonEmptyArray(files.regions, "locations", regionsData.locations);
  locations.forEach((location, index) => {
    const prefix = `locations[${index}]`;
    uniqueId(files.regions, `${prefix}.id`, location?.id, locationIds, "world location id");
    nonEmptyString(files.regions, `${prefix}.name`, location?.name);
    nonEmptyString(files.regions, `${prefix}.layer`, location?.layer);
    if (typeof location?.layer === "string" && location.layer.length > 0 && !layerIds.has(location.layer)) {
      issue(files.regions, `${prefix}.layer`, `references unknown layer: ${location.layer}`);
    }
    stringArray(files.regions, `${prefix}.tags`, location?.tags);
    enumArray(files.regions, `${prefix}.lifePhases`, location?.lifePhases, legalLifePhases, "life phase");
    nonEmptyString(files.regions, `${prefix}.description`, location?.description);
  });
}

function validateFactions(factionsData) {
  validateVersion(files.factions, factionsData.version);
  const factionIds = new Set();
  const factions = nonEmptyArray(files.factions, "factions", factionsData.factions);
  factions.forEach((faction, index) => {
    const prefix = `factions[${index}]`;
    uniqueId(files.factions, `${prefix}.id`, faction?.id, factionIds, "world faction id");
    nonEmptyString(files.factions, `${prefix}.name`, faction?.name);
    nonEmptyString(files.factions, `${prefix}.type`, faction?.type);
    nonEmptyString(files.factions, `${prefix}.visibilityInEarlyLife`, faction?.visibilityInEarlyLife);
    stringArray(files.factions, `${prefix}.tags`, faction?.tags);
    nonEmptyString(files.factions, `${prefix}.description`, faction?.description);
  });
}

function validateEventRules(eventRulesData) {
  validateVersion(files.eventRules, eventRulesData.version);
  const truthLevelIds = new Set();
  const truthLevels = nonEmptyArray(files.eventRules, "truthLevels", eventRulesData.truthLevels);
  truthLevels.forEach((truthLevel, index) => {
    const prefix = `truthLevels[${index}]`;
    const id = uniqueId(files.eventRules, `${prefix}.id`, truthLevel?.id, truthLevelIds, "world truth level id");
    if (id !== undefined && !legalTruthLevels.has(id)) {
      issue(files.eventRules, `${prefix}.id`, `is not a legal truth level: ${id}`);
    }
    nonEmptyString(files.eventRules, `${prefix}.name`, truthLevel?.name);
    nonEmptyString(files.eventRules, `${prefix}.description`, truthLevel?.description);
  });

  const ranges = [];
  const ageRestrictions = nonEmptyArray(files.eventRules, "ageRestrictions", eventRulesData.ageRestrictions);
  ageRestrictions.forEach((restriction, index) => {
    const prefix = `ageRestrictions[${index}]`;
    if (!legalLifePhases.has(restriction?.phase)) {
      issue(files.eventRules, `${prefix}.phase`, `is not legal: ${String(restriction?.phase)}`);
    }
    const range = ageRange(files.eventRules, `${prefix}.ageRangeMonths`, restriction?.ageRangeMonths);
    if (range !== undefined) {
      ranges.push({ path: `${prefix}.ageRangeMonths`, min: range[0], max: range[1] });
    }
    truthLevelArray(files.eventRules, `${prefix}.allowedTruthLevels`, restriction?.allowedTruthLevels, truthLevelIds);
    if (restriction?.allowedGameplayInterludes !== undefined) {
      enumArray(
        files.eventRules,
        `${prefix}.allowedGameplayInterludes`,
        restriction.allowedGameplayInterludes,
        legalGameplayInterludes,
        "gameplay interlude"
      );
    }
    if (restriction?.forbiddenGameplayInterludes !== undefined) {
      enumArray(
        files.eventRules,
        `${prefix}.forbiddenGameplayInterludes`,
        restriction.forbiddenGameplayInterludes,
        legalGameplayInterludes,
        "gameplay interlude"
      );
    }
    nonEmptyString(files.eventRules, `${prefix}.notes`, restriction?.notes);
  });
  validateRangeOverlap(files.eventRules, ranges);

  stringArray(files.eventRules, "forbiddenModernTerms", eventRulesData.forbiddenModernTerms);
  stringArray(files.eventRules, "requiredFieldsForEvents", eventRulesData.requiredFieldsForEvents);
  if (eventRulesData.hiddenNameLeakForbidden !== true) {
    issue(files.eventRules, "hiddenNameLeakForbidden", "must be true");
  }
}

function validateGlossary(glossaryData) {
  validateVersion(files.glossary, glossaryData.version);
  if (glossaryData.preferredTerms === null || typeof glossaryData.preferredTerms !== "object" || Array.isArray(glossaryData.preferredTerms)) {
    issue(files.glossary, "preferredTerms", "must be an object");
  } else {
    const entries = Object.entries(glossaryData.preferredTerms);
    if (entries.length === 0) {
      issue(files.glossary, "preferredTerms", "must contain at least one term group");
    }
    entries.forEach(([key, terms]) => {
      nonEmptyString(files.glossary, `preferredTerms.${key}.key`, key);
      stringArray(files.glossary, `preferredTerms.${key}`, terms);
    });
  }
  stringArray(files.glossary, "toneRules", glossaryData.toneRules);
  stringArray(files.glossary, "bannedTone", glossaryData.bannedTone);
}

function validateVersion(fileName, version) {
  if (version !== supportedVersion) {
    issue(fileName, "version", `must be "${supportedVersion}"`);
  }
}

function uniqueId(fileName, fieldPath, value, seen, label) {
  if (typeof value !== "string" || value.length === 0) {
    issue(fileName, fieldPath, "must not be empty");
    return undefined;
  }
  if (seen.has(value)) {
    issue(fileName, fieldPath, `duplicate ${label}: ${value}`);
    return value;
  }
  seen.add(value);
  return value;
}

function truthLevelArray(fileName, fieldPath, value, truthLevelIds) {
  const values = nonEmptyArray(fileName, fieldPath, value);
  values.forEach((truthLevel, index) => {
    if (typeof truthLevel !== "string" || truthLevel.length === 0) {
      issue(fileName, `${fieldPath}[${index}]`, "must not be empty");
    } else if (!truthLevelIds.has(truthLevel)) {
      issue(fileName, `${fieldPath}[${index}]`, `references unknown truth level: ${truthLevel}`);
    }
  });
}

function enumArray(fileName, fieldPath, value, legalValues, label) {
  const values = nonEmptyArray(fileName, fieldPath, value);
  values.forEach((item, index) => {
    if (!legalValues.has(item)) {
      issue(fileName, `${fieldPath}[${index}]`, `is not a legal ${label}: ${String(item)}`);
    }
  });
}

function stringArray(fileName, fieldPath, value) {
  const values = nonEmptyArray(fileName, fieldPath, value);
  values.forEach((item, index) => {
    nonEmptyString(fileName, `${fieldPath}[${index}]`, item);
  });
}

function nonEmptyArray(fileName, fieldPath, value) {
  if (!Array.isArray(value)) {
    issue(fileName, fieldPath, "must be an array");
    return [];
  }
  if (value.length === 0) {
    issue(fileName, fieldPath, "must contain at least one string");
  }
  return value;
}

function ageRange(fileName, fieldPath, value) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0]) || !Number.isInteger(value[1])) {
    issue(fileName, fieldPath, "must be a [min, max] integer tuple");
    return undefined;
  }
  const [min, max] = value;
  if (min < 0 || max < 0) {
    issue(fileName, fieldPath, "must be non-negative");
  }
  if (min > max) {
    issue(fileName, fieldPath, "min must be <= max");
    return undefined;
  }
  return [min, max];
}

function validateRangeOverlap(fileName, ranges) {
  const sorted = [...ranges].sort((a, b) => a.min - b.min || a.max - b.max);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.min <= previous.max) {
      issue(fileName, current.path, `overlaps ${previous.path}`);
    }
  }
}

function nonEmptyString(fileName, fieldPath, value) {
  if (typeof value !== "string" || value.length === 0) {
    issue(fileName, fieldPath, "must not be empty");
  }
}

function issue(fileName, fieldPath, reason) {
  issues.push(`${fileName}:${fieldPath}: ${reason}`);
}
