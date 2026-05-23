import { type ContentFile, normalizeContentPath } from "./ContentRegistry";

const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export function createContentHash(files: readonly ContentFile[]): string {
  const canonicalFiles = files
    .map((file) => ({
      path: normalizeContentPath(file.path),
      data: file.data
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return fnv1a32(stableStringify(canonicalFiles)).toString(16).padStart(8, "0");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

function fnv1a32(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}
