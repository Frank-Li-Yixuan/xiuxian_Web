import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { createContentHash } from "../../src/sim/content/ContentHash";
import { ContentRegistry, type ContentFile } from "../../src/sim/content/ContentRegistry";
import { validateContentRegistry } from "../../src/sim/content/DataValidator";

describe("ContentRegistry", () => {
  it("loads v0.1 data files into a stable id registry", () => {
    const files = loadJsonFiles("data");
    const registry = ContentRegistry.fromFiles(files);
    const entryIds = registry.getAllEntries().map((entry) => entry.id);

    expect(files.length).toBeGreaterThan(50);
    expect(entryIds).toEqual([...entryIds].sort());
    expect(registry.getById("stage_01_qingyun")?.category).toBe("stages");
    expect(registry.getById("boss_qingyun_tribulation_spirit")?.category).toBe("bosses");
    expect(registry.getById("enemy_mountain_imp")?.category).toBe("enemies");
    expect(registry.getById("reward_pool_qingyun_basic")?.category).toBe("rewards");
  });

  it("generates the same content hash regardless of file ordering", () => {
    const files = loadJsonFiles("data");
    const hashA = createContentHash(files);
    const hashB = createContentHash([...files].reverse());

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{8}$/);
  });

  it("validates the consolidated v0.1 data set", () => {
    const registry = ContentRegistry.fromFiles(loadJsonFiles("data"));

    expect(validateContentRegistry(registry)).toEqual([]);
  });

  it("reports duplicate ids with file, field path, and reason", () => {
    const registry = ContentRegistry.fromFiles([
      {
        path: "data/enemies/enemies.test.json",
        data: {
          schema: "EnemyDefinition[]",
          items: [{ id: "duplicate_id", drops: "drop_ok", hp: 1, speed: 1, contactDamage: 1 }]
        }
      },
      {
        path: "data/bosses/bosses.test.json",
        data: {
          schema: "BossDefinition[]",
          items: [{ id: "duplicate_id", drops: "drop_ok", rewards: [] }]
        }
      },
      {
        path: "data/rewards/drop_tables.test.json",
        data: {
          schema: "DropTableDefinition[]",
          items: [{ id: "drop_ok", entries: [{ dropId: "spirit_stone_low", type: "outer_material", amount: 1, chance: 1 }] }]
        }
      }
    ]);

    expect(validateContentRegistry(registry)).toContainEqual(
      expect.objectContaining({
        file: "data/enemies/enemies.test.json",
        fieldPath: "items[0].id",
        reason: expect.stringContaining("Duplicate id")
      })
    );
  });

  it("reports missing cross-table references with precise paths", () => {
    const registry = ContentRegistry.fromFiles([
      {
        path: "data/stages/stage_bad.test.json",
        data: {
          schema: "StageDefinition",
          id: "stage_bad",
          bossId: "missing_boss",
          segments: [
            {
              id: "segment_bad",
              duration: 10,
              waves: [
                {
                  startTime: 0,
                  endTime: 5,
                  spawnGroups: [{ enemyId: "missing_enemy", count: 1, interval: 1 }]
                }
              ],
              endEvent: { type: "insight", rewardPoolId: "missing_reward_pool" }
            }
          ]
        }
      }
    ]);

    const issues = validateContentRegistry(registry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        file: "data/stages/stage_bad.test.json",
        fieldPath: "bossId",
        reason: expect.stringContaining("missing bosses id")
      })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        file: "data/stages/stage_bad.test.json",
        fieldPath: "segments[0].waves[0].spawnGroups[0].enemyId",
        reason: expect.stringContaining("missing enemies id")
      })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        file: "data/stages/stage_bad.test.json",
        fieldPath: "segments[0].endEvent.rewardPoolId",
        reason: expect.stringContaining("missing rewards id")
      })
    );
  });
});

function loadJsonFiles(rootDir: string): ContentFile[] {
  const absoluteRoot = join(process.cwd(), rootDir);
  const files: ContentFile[] = [];

  walk(absoluteRoot, (absolutePath) => {
    files.push({
      path: join(rootDir, relative(absoluteRoot, absolutePath)).replaceAll("\\", "/"),
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
