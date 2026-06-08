#!/usr/bin/env tsx
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  buildSimRedesignContentRegistry,
  SIM_REDESIGN_DATA_DOMAINS,
  type SimRedesignContentFile
} from "../src/data/SimRedesignRegistry";
import { getSimRedesignDomainSpec } from "../src/data/registries/SimRedesignDomainRegistry";
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
    const spec = getSimRedesignDomainSpec(domain);
    const domainRelativePath = spec.directory.replace(/^data\//, "");
    const absoluteDomainPath = join(absoluteRoot, domainRelativePath);

    if (!existsDirectory(absoluteDomainPath)) {
      continue;
    }

    walk(absoluteDomainPath, (absolutePath) => {
      files.push({
        path: join(root, domainRelativePath, relative(absoluteDomainPath, absolutePath)).replaceAll("\\", "/"),
        data: JSON.parse(readFileSync(absolutePath, "utf8")) as unknown
      });
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function existsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
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
