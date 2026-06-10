import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildSimRedesignContentRegistry,
  getSimRedesignCoreFilePath,
  SIM_REDESIGN_DATA_DOMAINS,
  validateSimRedesignContentRegistry,
  type SimRedesignContentFile,
  type SimRedesignDataDomain
} from "../../src/data/SimRedesignRegistry";

describe("SimRedesignContentRegistry", () => {
  it("loads checked-in SIM-REDESIGN v0.2 data for every required domain", () => {
    const registry = buildSimRedesignContentRegistry(loadCheckedInSimRedesignFiles());

    expect(validateSimRedesignContentRegistry(registry)).toEqual([]);
    expect(registry.getDomains()).toEqual(SIM_REDESIGN_DATA_DOMAINS);
    expect(registry.getAllEntries()).toHaveLength(SIM_REDESIGN_DATA_DOMAINS.length * 2);
    expect(registry.getById("world.region.qingshi_village")?.domain).toBe("world");
    expect(registry.getById("fate_matrix.nine_palace.core_stats")?.moduleId).toBe("ninePalace");
  });

  it("fails validation when a required domain file is missing", () => {
    const files = makeMinimalFiles().filter((file) => !file.path.startsWith("data/world/"));
    const registry = buildSimRedesignContentRegistry(files);

    expect(validateSimRedesignContentRegistry(registry)).toContainEqual({
      file: "data/world/",
      fieldPath: "domain",
      reason: "missing required SIM-REDESIGN data file for domain 'world'"
    });
  });

  it("fails validation for invalid ids", () => {
    const files = makeMinimalFiles({
      world: {
        schemaVersion: "0.2",
        domain: "world",
        id: "World Bad Id",
        items: [{ id: "world.valid_item" }]
      }
    });
    const registry = buildSimRedesignContentRegistry(files);

    expect(validateSimRedesignContentRegistry(registry)).toContainEqual({
      file: "data/world/world.fixture.json",
      fieldPath: "id",
      reason: "invalid id 'World Bad Id'"
    });
  });

  it("fails validation for duplicate ids across domains", () => {
    const files = makeMinimalFiles({
      destiny_v2: {
        schemaVersion: "0.2",
        domain: "destiny_v2",
        id: "destiny_v2.fixture.v0_2",
        items: [{ id: "world.fixture.item" }]
      }
    });
    const registry = buildSimRedesignContentRegistry(files);

    expect(validateSimRedesignContentRegistry(registry)).toContainEqual(
      expect.objectContaining({
        file: "data/world/world.fixture.json",
        fieldPath: "items[0].id",
        reason: expect.stringContaining("duplicate id 'world.fixture.item'")
      })
    );
  });

  it("fails validation when file path and declared domain disagree", () => {
    const files = makeMinimalFiles({
      life_playable: {
        schemaVersion: "0.2",
        domain: "world",
        id: "life_playable.fixture.v0_2",
        items: [{ id: "life_playable.fixture.item" }]
      }
    });
    const registry = buildSimRedesignContentRegistry(files);

    expect(validateSimRedesignContentRegistry(registry)).toContainEqual({
      file: "data/life_playable/life_playable.fixture.json",
      fieldPath: "domain",
      reason: "domain must be 'life_playable'"
    });
  });

  it("fails validation when a file does not match the minimum schema shape", () => {
    const files = makeMinimalFiles({
      llm_narrative: {
        schemaVersion: "0.2",
        domain: "llm_narrative",
        id: "llm_narrative.fixture.v0_2"
      }
    });
    const registry = buildSimRedesignContentRegistry(files);

    expect(validateSimRedesignContentRegistry(registry)).toContainEqual({
      file: "data/llm_narrative/llm_narrative.fixture.json",
      fieldPath: "items",
      reason: "items must be an array"
    });
  });
});

function loadCheckedInSimRedesignFiles(): SimRedesignContentFile[] {
  return SIM_REDESIGN_DATA_DOMAINS.map((domain) => {
    const path = getSimRedesignCoreFilePath(domain);
    return {
      path,
      data: JSON.parse(readFileSync(path, "utf8")) as unknown
    };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function makeMinimalFiles(
  overrides: Partial<Record<SimRedesignDataDomain, unknown>> = {}
): SimRedesignContentFile[] {
  return SIM_REDESIGN_DATA_DOMAINS.map((domain) => ({
    path: `data/${domain}/${domain}.fixture.json`,
    data:
      overrides[domain] ??
      ({
        schemaVersion: "0.2",
        domain,
        id: `${domain}.fixture.v0_2`,
        items: [{ id: `${domain}.fixture.item` }]
      } satisfies Record<string, unknown>)
  }));
}
