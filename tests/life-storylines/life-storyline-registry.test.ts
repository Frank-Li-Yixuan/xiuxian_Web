import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import eventThreadsData from "../../data/life_storylines/event_threads.v0.1.json";
import storylineDefinitionsData from "../../data/life_storylines/storyline_definitions.v0.1.json";
import storylineScoringRulesData from "../../data/life_storylines/storyline_scoring_rules.v0.1.json";
import {
  createLifeStorylineRegistry,
  loadLifeStorylineRegistry,
  validateLifeStorylineData
} from "../../src/lifeStorylines/LifeStorylineRegistry";

describe("LifeStorylineRegistry", () => {
  it("loads checked-in LST v0.1 data into stable lookup registries", () => {
    const registry = loadLifeStorylineRegistry();

    expect(registry.listStorylines()).toHaveLength(8);
    expect(registry.listThreadsByStoryline("storyline_poor_scholar")).toHaveLength(4);
    expect(registry.getStoryline("storyline_poor_scholar").eventThreadIds).toContain(
      "thread_private_school_enlightenment"
    );
    expect(registry.getThread("thread_private_school_enlightenment").storylineId).toBe("storyline_poor_scholar");
    expect(registry.scoringRules.statusThresholds.active).toEqual([40, 69]);
    expect(Object.isFrozen(registry.listStorylines())).toBe(true);
    expect(Object.isFrozen(registry.getStoryline("storyline_poor_scholar"))).toBe(true);
    expect(Object.isFrozen(registry.getThread("thread_private_school_enlightenment").stageSequence[0])).toBe(true);
  });

  it("throws readable errors for missing lookup ids", () => {
    const registry = loadLifeStorylineRegistry();

    expect(() => registry.getStoryline("missing_storyline")).toThrow("Missing life storyline: missing_storyline");
    expect(() => registry.getThread("missing_thread")).toThrow("Missing life event thread: missing_thread");
    expect(() => registry.listThreadsByStoryline("missing_storyline")).toThrow(
      "Missing life storyline: missing_storyline"
    );
  });

  it("fails validation for duplicate storyline and thread ids", () => {
    const invalid = cloneLifeStorylineData();
    invalid.storylineDefinitions.storylines[1].id = invalid.storylineDefinitions.storylines[0].id;
    invalid.eventThreads.eventThreads[1].id = invalid.eventThreads.eventThreads[0].id;

    const issues = validateLifeStorylineData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate life storyline id: ${invalid.storylineDefinitions.storylines[0].id}`),
        expect.stringContaining(`duplicate life event thread id: ${invalid.eventThreads.eventThreads[0].id}`)
      ])
    );
    expect(() => createLifeStorylineRegistry(invalid)).toThrow("Life storyline data validation failed");
  });

  it("fails validation when a storyline references a missing thread", () => {
    const invalid = cloneLifeStorylineData();
    invalid.storylineDefinitions.storylines[0].eventThreadIds = ["missing_thread"];

    expect(validateLifeStorylineData(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("storyline_definitions.storylines[0].eventThreadIds[0] references missing thread: missing_thread")
      ])
    );
  });

  it("fails validation when a thread references a missing storyline", () => {
    const invalid = cloneLifeStorylineData();
    invalid.eventThreads.eventThreads[0].storylineId = "missing_storyline";

    expect(validateLifeStorylineData(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("event_threads.eventThreads[0].storylineId references missing storyline: missing_storyline")
      ])
    );
  });

  it("fails validation when a thread is not listed by its owning storyline", () => {
    const invalid = cloneLifeStorylineData();
    const thread = invalid.eventThreads.eventThreads[0];
    invalid.storylineDefinitions.storylines[0].eventThreadIds =
      invalid.storylineDefinitions.storylines[0].eventThreadIds.filter((id: string) => id !== thread.id);

    expect(validateLifeStorylineData(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `event_threads.eventThreads[0].id is not listed by owning storyline ${thread.storylineId}`
        )
      ])
    );
  });

  it("fails validation for malformed scoring rules and malformed stage data", () => {
    const invalid = cloneLifeStorylineData();
    invalid.storylineScoringRules.statusThresholds.active = [70, 40];
    invalid.storylineScoringRules.threadStageThresholds = {};
    invalid.eventThreads.eventThreads[0].stageSequence[0].stage = "impossible";
    invalid.eventThreads.eventThreads[0].stageSequence[1].recommendedAgeRange = [120, 60];

    const issues = validateLifeStorylineData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("storyline_scoring_rules.statusThresholds.active min must be <= max"),
        expect.stringContaining("storyline_scoring_rules.threadStageThresholds.seeded must exist"),
        expect.stringContaining("event_threads.eventThreads[0].stageSequence[0].stage is not legal: impossible"),
        expect.stringContaining("event_threads.eventThreads[0].stageSequence[1].recommendedAgeRange min must be <= max")
      ])
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the registry", () => {
    const source = readFileSync("src/lifeStorylines/LifeStorylineRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });
});

function cloneLifeStorylineData(): any {
  return {
    storylineDefinitions: structuredClone(storylineDefinitionsData),
    eventThreads: structuredClone(eventThreadsData),
    storylineScoringRules: structuredClone(storylineScoringRulesData)
  };
}
