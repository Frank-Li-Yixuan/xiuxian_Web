#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildSimRedesignContentRegistry,
  getSimRedesignCoreFilePath,
  SIM_REDESIGN_DATA_DOMAINS,
  type SimRedesignContentFile
} from "../src/data/SimRedesignRegistry";
import { validateSimRedesignContentRegistry } from "../src/data/SimRedesignRegistry";

const rootDir = process.argv[2] ?? "data";
const files = loadSimRedesignDataFiles(rootDir);
const registry = buildSimRedesignContentRegistry(files);
const issues = validateSimRedesignContentRegistry(registry);

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.file}:${issue.fieldPath}: ${issue.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${files.length} SIM-REDESIGN JSON files, ${registry.getAllEntries().length} ids, domains=${registry
      .getDomains()
      .join(",")}.`
  );
}

export function loadSimRedesignDataFiles(root: string): SimRedesignContentFile[] {
  const absoluteRoot = join(process.cwd(), root);
  const files: SimRedesignContentFile[] = [];

  for (const domain of SIM_REDESIGN_DATA_DOMAINS) {
    const canonicalPath = getSimRedesignCoreFilePath(domain);
    const rootRelativePath = canonicalPath.replace(/^data\//, "");
    const absolutePath = join(absoluteRoot, rootRelativePath);

    if (!existsSync(absolutePath)) {
      continue;
    }

    files.push({
      path: canonicalPath,
      data: JSON.parse(readFileSync(absolutePath, "utf8")) as unknown
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}
