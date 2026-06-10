export const SIM_REDESIGN_DATA_DOMAINS = [
  "world",
  "fate_matrix",
  "destiny_v2",
  "origin_fate_v02",
  "life_storylines",
  "life_interludes",
  "life_stage",
  "life_sim_v02",
  "life_choices_v02",
  "llm_narrative",
  "life_playable"
] as const;

export type SimRedesignDataDomain = (typeof SIM_REDESIGN_DATA_DOMAINS)[number];

export type SimRedesignModuleId =
  | "world"
  | "ninePalace"
  | "destinyV2"
  | "originFateV2"
  | "lifeStorylines"
  | "lifeInterludes"
  | "lifeStages"
  | "monthlyEventsV02"
  | "majorChoicesV02"
  | "llmNarrative"
  | "lifePlayable";

export interface SimRedesignDomainSpec {
  readonly domain: SimRedesignDataDomain;
  readonly directory: string;
  readonly moduleId: SimRedesignModuleId;
}

export interface SimRedesignDomainFile {
  readonly path: string;
  readonly data: unknown;
}

export interface SimRedesignValidationIssue {
  readonly file: string;
  readonly fieldPath: string;
  readonly reason: string;
}

export interface SimRedesignDomainRegistry {
  readonly spec: SimRedesignDomainSpec;
  loadFiles(files: readonly SimRedesignDomainFile[]): readonly SimRedesignDomainFile[];
  isSchema(value: unknown): boolean;
  validateFile(file: SimRedesignDomainFile): readonly SimRedesignValidationIssue[];
}

export const SIM_REDESIGN_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export const SIM_REDESIGN_DOMAIN_SPECS: readonly SimRedesignDomainSpec[] = [
  { domain: "world", directory: "data/world", moduleId: "world" },
  { domain: "fate_matrix", directory: "data/fate_matrix", moduleId: "ninePalace" },
  { domain: "destiny_v2", directory: "data/destiny_v2", moduleId: "destinyV2" },
  { domain: "origin_fate_v02", directory: "data/origin_fate_v02", moduleId: "originFateV2" },
  { domain: "life_storylines", directory: "data/life_storylines", moduleId: "lifeStorylines" },
  { domain: "life_interludes", directory: "data/life_interludes", moduleId: "lifeInterludes" },
  { domain: "life_stage", directory: "data/life_stage", moduleId: "lifeStages" },
  { domain: "life_sim_v02", directory: "data/life_sim_v02", moduleId: "monthlyEventsV02" },
  { domain: "life_choices_v02", directory: "data/life_choices_v02", moduleId: "majorChoicesV02" },
  { domain: "llm_narrative", directory: "data/llm_narrative", moduleId: "llmNarrative" },
  { domain: "life_playable", directory: "data/life_playable", moduleId: "lifePlayable" }
];

export const SIM_REDESIGN_DOMAIN_REGISTRIES: readonly SimRedesignDomainRegistry[] = SIM_REDESIGN_DOMAIN_SPECS.map(
  createSimRedesignDomainRegistry
);

const DOMAIN_SET = new Set<string>(SIM_REDESIGN_DATA_DOMAINS);

export function isSimRedesignDataDomain(value: unknown): value is SimRedesignDataDomain {
  return typeof value === "string" && DOMAIN_SET.has(value);
}

export function isValidSimRedesignId(id: string): boolean {
  return SIM_REDESIGN_ID_PATTERN.test(id);
}

export function normalizeSimRedesignPath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function inferSimRedesignDomainFromPath(path: string): SimRedesignDataDomain | undefined {
  const parts = normalizeSimRedesignPath(path).split("/").filter(Boolean);
  const dataIndex = parts.lastIndexOf("data");
  const candidate = parts[dataIndex >= 0 ? dataIndex + 1 : 0];
  return isSimRedesignDataDomain(candidate) ? candidate : undefined;
}

export function getSimRedesignDomainSpec(domain: SimRedesignDataDomain): SimRedesignDomainSpec {
  const spec = SIM_REDESIGN_DOMAIN_SPECS.find((candidate) => candidate.domain === domain);
  if (spec === undefined) {
    throw new Error(`Unknown SIM-REDESIGN data domain: ${domain}`);
  }
  return spec;
}

export function getSimRedesignDomainRegistry(domain: SimRedesignDataDomain): SimRedesignDomainRegistry {
  const registry = SIM_REDESIGN_DOMAIN_REGISTRIES.find((candidate) => candidate.spec.domain === domain);
  if (registry === undefined) {
    throw new Error(`Unknown SIM-REDESIGN domain registry: ${domain}`);
  }
  return registry;
}

export function getSimRedesignCoreFilePath(domain: SimRedesignDataDomain): string {
  const spec = getSimRedesignDomainSpec(domain);
  return `${spec.directory}/${domain}_core.v0.2.json`;
}

function createSimRedesignDomainRegistry(spec: SimRedesignDomainSpec): SimRedesignDomainRegistry {
  return {
    spec,
    loadFiles(files) {
      return files.filter((file) => inferSimRedesignDomainFromPath(file.path) === spec.domain);
    },
    isSchema(value) {
      const object = asRecord(value);
      return object?.schemaVersion === "0.2" && object.domain === spec.domain && Array.isArray(object.items);
    },
    validateFile(file) {
      return validateDomainFile(file, spec);
    }
  };
}

function validateDomainFile(file: SimRedesignDomainFile, spec: SimRedesignDomainSpec): SimRedesignValidationIssue[] {
  const issues: SimRedesignValidationIssue[] = [];
  const object = asRecord(file.data);

  if (object === undefined) {
    issues.push({ file: file.path, fieldPath: "$", reason: "SIM-REDESIGN data file must be a JSON object" });
    return issues;
  }

  if (object.schemaVersion !== "0.2") {
    issues.push({ file: file.path, fieldPath: "schemaVersion", reason: "schemaVersion must be '0.2'" });
  }

  if (object.domain !== spec.domain) {
    issues.push({ file: file.path, fieldPath: "domain", reason: `domain must be '${spec.domain}'` });
  }

  validateIdField(file.path, "id", object.id, issues);

  if (!Array.isArray(object.items)) {
    issues.push({ file: file.path, fieldPath: "items", reason: "items must be an array" });
    return issues;
  }

  for (let index = 0; index < object.items.length; index += 1) {
    const item = asRecord(object.items[index]);
    if (item === undefined) {
      issues.push({ file: file.path, fieldPath: `items[${index}]`, reason: "item must be a JSON object" });
      continue;
    }
    validateIdField(file.path, `items[${index}].id`, item.id, issues);
  }

  return issues;
}

function validateIdField(
  file: string,
  fieldPath: string,
  value: unknown,
  issues: SimRedesignValidationIssue[]
): void {
  if (typeof value !== "string") {
    issues.push({ file, fieldPath, reason: "id must be a string" });
    return;
  }
  if (!isValidSimRedesignId(value)) {
    issues.push({ file, fieldPath, reason: `invalid id '${value}'` });
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
