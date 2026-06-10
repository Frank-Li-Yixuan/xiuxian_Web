import {
  getSimRedesignDomainRegistry,
  getSimRedesignDomainSpec,
  getSimRedesignCoreFilePath,
  inferSimRedesignDomainFromPath,
  isSimRedesignDataDomain,
  normalizeSimRedesignPath,
  SIM_REDESIGN_DATA_DOMAINS,
  SIM_REDESIGN_DOMAIN_REGISTRIES,
  type SimRedesignDataDomain,
  type SimRedesignDomainFile,
  type SimRedesignModuleId,
  type SimRedesignValidationIssue
} from "./registries/SimRedesignDomainRegistry";

export {
  SIM_REDESIGN_DATA_DOMAINS,
  SIM_REDESIGN_DOMAIN_REGISTRIES,
  getSimRedesignCoreFilePath,
  type SimRedesignDataDomain,
  type SimRedesignModuleId,
  type SimRedesignValidationIssue
} from "./registries/SimRedesignDomainRegistry";

export type SimRedesignJsonPrimitive = string | number | boolean | null;
export type SimRedesignJsonValue = SimRedesignJsonPrimitive | SimRedesignJsonObject | SimRedesignJsonValue[];

export interface SimRedesignJsonObject {
  readonly [key: string]: SimRedesignJsonValue;
}

export interface SimRedesignContentFile extends SimRedesignDomainFile {}

export interface SimRedesignContentEntry {
  readonly id: string;
  readonly domain: SimRedesignDataDomain;
  readonly moduleId: SimRedesignModuleId;
  readonly path: string;
  readonly fieldPath: string;
  readonly kind: "file" | "item";
  readonly value: SimRedesignJsonObject;
}

export class SimRedesignContentRegistry {
  private readonly files: readonly SimRedesignContentFile[];
  private readonly entries: readonly SimRedesignContentEntry[];
  private readonly entriesById = new Map<string, SimRedesignContentEntry[]>();
  private readonly entriesByDomain = new Map<SimRedesignDataDomain, SimRedesignContentEntry[]>();

  public constructor(files: readonly SimRedesignContentFile[], entries: readonly SimRedesignContentEntry[]) {
    this.files = files;
    this.entries = entries;

    for (const entry of entries) {
      const byId = this.entriesById.get(entry.id) ?? [];
      byId.push(entry);
      this.entriesById.set(entry.id, byId);

      const byDomain = this.entriesByDomain.get(entry.domain) ?? [];
      byDomain.push(entry);
      this.entriesByDomain.set(entry.domain, byDomain);
    }
  }

  public getAllFiles(): readonly SimRedesignContentFile[] {
    return this.files;
  }

  public getAllEntries(): readonly SimRedesignContentEntry[] {
    return this.entries;
  }

  public getDomains(): readonly SimRedesignDataDomain[] {
    return SIM_REDESIGN_DATA_DOMAINS.filter((domain) => this.entriesByDomain.has(domain));
  }

  public getById(id: string): SimRedesignContentEntry | undefined {
    return this.entriesById.get(id)?.[0];
  }

  public getEntriesById(id: string): readonly SimRedesignContentEntry[] {
    return this.entriesById.get(id) ?? [];
  }

  public getEntriesByDomain(domain: SimRedesignDataDomain): readonly SimRedesignContentEntry[] {
    return this.entriesByDomain.get(domain) ?? [];
  }

  public hasId(id: string): boolean {
    return this.entriesById.has(id);
  }

  public hasDomain(domain: SimRedesignDataDomain): boolean {
    return this.entriesByDomain.has(domain);
  }
}

export function buildSimRedesignContentRegistry(
  files: readonly SimRedesignContentFile[]
): SimRedesignContentRegistry {
  const normalizedFiles = files
    .map((file) => ({
      path: normalizeSimRedesignPath(file.path),
      data: file.data
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const entries = normalizedFiles
    .flatMap((file) => extractEntries(file))
    .sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path) || a.fieldPath.localeCompare(b.fieldPath));

  return new SimRedesignContentRegistry(normalizedFiles, entries);
}

export function validateSimRedesignContentRegistry(
  registry: SimRedesignContentRegistry
): SimRedesignValidationIssue[] {
  const issues: SimRedesignValidationIssue[] = [];

  validateMissingDomains(registry, issues);
  validateFiles(registry, issues);
  validateDuplicateIds(registry, issues);

  return issues.sort(
    (a, b) => a.file.localeCompare(b.file) || a.fieldPath.localeCompare(b.fieldPath) || a.reason.localeCompare(b.reason)
  );
}

function extractEntries(file: SimRedesignContentFile): SimRedesignContentEntry[] {
  const object = asJsonObject(file.data);
  if (object === undefined) {
    return [];
  }

  const pathDomain = inferSimRedesignDomainFromPath(file.path);
  const dataDomain = isSimRedesignDataDomain(object.domain) ? object.domain : undefined;
  const domain = dataDomain ?? pathDomain;
  if (domain === undefined) {
    return [];
  }

  const spec = getSimRedesignDomainSpec(domain);
  const entries: SimRedesignContentEntry[] = [];

  if (typeof object.id === "string") {
    entries.push({
      id: object.id,
      domain,
      moduleId: spec.moduleId,
      path: file.path,
      fieldPath: "id",
      kind: "file",
      value: object
    });
  }

  if (Array.isArray(object.items)) {
    for (let index = 0; index < object.items.length; index += 1) {
      const item = asJsonObject(object.items[index]);
      if (item !== undefined && typeof item.id === "string") {
        entries.push({
          id: item.id,
          domain,
          moduleId: spec.moduleId,
          path: file.path,
          fieldPath: `items[${index}].id`,
          kind: "item",
          value: item
        });
      }
    }
  }

  return entries;
}

function validateMissingDomains(
  registry: SimRedesignContentRegistry,
  issues: SimRedesignValidationIssue[]
): void {
  for (const domain of SIM_REDESIGN_DATA_DOMAINS) {
    if (!registry.hasDomain(domain)) {
      issues.push({
        file: `${getSimRedesignDomainSpec(domain).directory}/`,
        fieldPath: "domain",
        reason: `missing required SIM-REDESIGN data file for domain '${domain}'`
      });
    }
  }
}

function validateFiles(registry: SimRedesignContentRegistry, issues: SimRedesignValidationIssue[]): void {
  for (const file of registry.getAllFiles()) {
    const domain = inferSimRedesignDomainFromPath(file.path);
    if (domain === undefined) {
      issues.push({
        file: file.path,
        fieldPath: "path",
        reason: "file must be under a required SIM-REDESIGN data directory"
      });
      continue;
    }

    issues.push(...getSimRedesignDomainRegistry(domain).validateFile(file));
  }
}

function validateDuplicateIds(
  registry: SimRedesignContentRegistry,
  issues: SimRedesignValidationIssue[]
): void {
  const firstById = new Map<string, SimRedesignContentEntry>();

  for (const entry of registry.getAllEntries()) {
    const first = firstById.get(entry.id);
    if (first === undefined) {
      firstById.set(entry.id, entry);
      continue;
    }

    issues.push({
      file: entry.path,
      fieldPath: entry.fieldPath,
      reason: `duplicate id '${entry.id}' first declared at ${first.path}:${first.fieldPath}`
    });
  }
}

function asJsonObject(value: unknown): SimRedesignJsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SimRedesignJsonObject)
    : undefined;
}
