export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface ContentFile {
  readonly path: string;
  readonly data: unknown;
}

export interface ContentEntry {
  readonly id: string;
  readonly category: string;
  readonly path: string;
  readonly fieldPath: string;
  readonly value: JsonObject;
}

export class ContentRegistry {
  private readonly files: readonly ContentFile[];
  private readonly entries: readonly ContentEntry[];
  private readonly entriesById = new Map<string, ContentEntry[]>();
  private readonly entriesByCategory = new Map<string, ContentEntry[]>();

  private constructor(files: readonly ContentFile[], entries: readonly ContentEntry[]) {
    this.files = files;
    this.entries = entries;

    for (const entry of entries) {
      const byId = this.entriesById.get(entry.id) ?? [];
      byId.push(entry);
      this.entriesById.set(entry.id, byId);

      const byCategory = this.entriesByCategory.get(entry.category) ?? [];
      byCategory.push(entry);
      this.entriesByCategory.set(entry.category, byCategory);
    }
  }

  public static fromFiles(files: readonly ContentFile[]): ContentRegistry {
    const normalizedFiles = files
      .map((file) => ({
        path: normalizeContentPath(file.path),
        data: file.data
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    const entries = normalizedFiles
      .flatMap((file) => extractEntries(file))
      .sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path) || a.fieldPath.localeCompare(b.fieldPath));

    return new ContentRegistry(normalizedFiles, entries);
  }

  public getAllFiles(): readonly ContentFile[] {
    return this.files;
  }

  public getAllEntries(): readonly ContentEntry[] {
    return this.entries;
  }

  public getById(id: string): ContentEntry | undefined {
    return this.entriesById.get(id)?.[0];
  }

  public getEntriesById(id: string): readonly ContentEntry[] {
    return this.entriesById.get(id) ?? [];
  }

  public getEntriesByCategory(category: string): readonly ContentEntry[] {
    return this.entriesByCategory.get(category) ?? [];
  }

  public hasId(id: string): boolean {
    return this.entriesById.has(id);
  }

  public hasIdInCategory(category: string, id: string): boolean {
    return this.getEntriesByCategory(category).some((entry) => entry.id === id);
  }
}

export function normalizeContentPath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractEntries(file: ContentFile): ContentEntry[] {
  if (!isJsonObject(file.data)) {
    return [];
  }

  const category = inferCategory(file.path);
  const entries: ContentEntry[] = [];

  if (typeof file.data.id === "string") {
    entries.push({
      id: file.data.id,
      category,
      path: file.path,
      fieldPath: "id",
      value: file.data
    });
  }

  const items = file.data.items;
  if (Array.isArray(items)) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (isJsonObject(item) && typeof item.id === "string") {
        entries.push({
          id: item.id,
          category,
          path: file.path,
          fieldPath: `items[${index}].id`,
          value: item
        });
      }
    }
  }

  return entries;
}

function inferCategory(path: string): string {
  const parts = normalizeContentPath(path).split("/").filter(Boolean);
  const dataIndex = parts.lastIndexOf("data");
  return parts[dataIndex >= 0 ? dataIndex + 1 : 0] ?? "unknown";
}
