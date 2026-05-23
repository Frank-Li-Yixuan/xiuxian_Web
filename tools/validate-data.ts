#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createContentHash } from "../src/sim/content/ContentHash";
import { ContentRegistry, type ContentFile } from "../src/sim/content/ContentRegistry";
import { validateContentRegistry } from "../src/sim/content/DataValidator";

const rootDir = process.argv[2] ?? "data";
const files = loadContentFiles(rootDir);
const registry = ContentRegistry.fromFiles(files);
const issues = validateContentRegistry(registry);

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.file}:${issue.fieldPath}: ${issue.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${files.length} JSON files, ${registry.getAllEntries().length} content ids, contentHash=${createContentHash(files)}.`
  );
}

export function loadContentFiles(root: string): ContentFile[] {
  const absoluteRoot = join(process.cwd(), root);
  const files: ContentFile[] = [];

  walk(absoluteRoot, (absolutePath) => {
    files.push({
      path: join(root, relative(absoluteRoot, absolutePath)).replaceAll("\\", "/"),
      data: JSON.parse(readFileSync(absolutePath, "utf8")) as unknown
    });
  });

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function walk(dir: string, onFile: (file: string) => void): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, onFile);
    } else if (name.endsWith(".json")) {
      onFile(path);
    }
  }
}
