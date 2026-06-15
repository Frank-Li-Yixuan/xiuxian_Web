import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevLifeStorylinesScreen } from "../../src/app/screens/DevLifeStorylinesScreen";
import {
  buildDevLifeStorylinesReport,
  DEV_LIFE_STORYLINE_SAMPLE_IDS
} from "../../src/lifeStorylines/DevLifeStorylineDebugReport";

describe("dev life storylines screen", () => {
  it("routes /dev/life-storylines through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/life-storylines");
    expect(mainSource).toContain("DevLifeStorylinesScreen");
    expect(mainSource).not.toContain("MainMenuApp /> : window.location.pathname === \"/dev/life-storylines\"");
  });

  it("renders the default debug report with sample selector, scoring, threads, and candidates", () => {
    const markup = renderToStaticMarkup(createElement(DevLifeStorylinesScreen));

    expect(markup).toContain("dev-life-storylines");
    expect(markup).toContain("药铺丹修");
    expect(markup).toContain("废灵剑修");
    expect(markup).toContain("阴梦魂修");
    expect(markup).toContain("天妒雷修");
    expect(markup).toContain("山村灾劫");
    expect(markup).toContain("activeStorylines");
    expect(markup).toContain("score breakdown");
    expect(markup).toContain("eventThreads");
    expect(markup).toContain("progress");
    expect(markup).toContain("tension");
    expect(markup).toContain("clarity");
    expect(markup).toContain("risk");
    expect(markup).toContain("playInterludeCandidateHooks");
    expect(markup).toContain("transitionCandidateHooks");
    expect(markup).not.toContain("trueName");
    expect(markup).not.toContain("true_name");
    expect(markup).not.toContain("truename");
  });

  it("builds deterministic frozen reports for all five samples with expected storyline/thread ids", () => {
    expect(DEV_LIFE_STORYLINE_SAMPLE_IDS).toEqual([
      "sample_alchemy_child",
      "sample_waste_sword",
      "sample_yin_dream",
      "sample_thunder_talent",
      "sample_village_calamity"
    ]);

    const expected = {
      sample_alchemy_child: {
        topStorylineId: "storyline_apothecary_alchemy",
        threadId: "thread_furnace_dream"
      },
      sample_waste_sword: {
        topStorylineId: "storyline_fallen_cultivator_lineage",
        threadId: "thread_wooden_sword_rings"
      },
      sample_yin_dream: {
        topStorylineId: "storyline_yin_dream_soul",
        threadId: "thread_black_flute_whispers"
      },
      sample_thunder_talent: {
        topStorylineId: "storyline_system_prelude",
        threadId: "thread_outer_battlefield_dream"
      },
      sample_village_calamity: {
        topStorylineId: "storyline_village_calamity",
        threadId: "thread_bandit_smoke"
      }
    } as const;

    for (const sampleId of DEV_LIFE_STORYLINE_SAMPLE_IDS) {
      const first = buildDevLifeStorylinesReport(sampleId);
      const second = buildDevLifeStorylinesReport(sampleId);
      const topStoryline = first.scoring.storylines[0];

      expect(first).toEqual(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.activeStorylines)).toBe(true);
      expect(Object.isFrozen(first.eventThreads)).toBe(true);
      expect(topStoryline?.storylineId).toBe(expected[sampleId].topStorylineId);
      expect(first.eventThreads.map((thread) => thread.threadId)).toContain(expected[sampleId].threadId);
    }
  });

  it("renders the village calamity crisis sample with crisis thread and interlude candidates", () => {
    const report = buildDevLifeStorylinesReport("sample_village_calamity");
    const markup = renderToStaticMarkup(createElement(DevLifeStorylinesScreen, {
      initialSampleId: "sample_village_calamity"
    }));

    expect(report.sample.label).toBe("山村灾劫");
    expect(report.activeStorylines.map((storyline) => storyline.storylineId)).toContain("storyline_village_calamity");
    expect(report.eventThreads.find((thread) => thread.threadId === "thread_bandit_smoke")).toMatchObject({
      stage: "crisis",
      tension: 78
    });
    expect(report.playInterludeCandidateHooks).toEqual(
      expect.arrayContaining(["play_horde_village_defense", "play_stg_escape_bandit_chase"])
    );
    expect(markup).toContain("storyline_village_calamity");
    expect(markup).toContain("thread_bandit_smoke");
    expect(markup).toContain("crisis");
    expect(markup).toContain("play_horde_village_defense");
  });

  it("keeps report, markup, and new source files public-safe and deterministic-source safe", () => {
    const report = buildDevLifeStorylinesReport("sample_alchemy_child");
    const markup = renderToStaticMarkup(createElement(DevLifeStorylinesScreen, {
      initialSampleId: "sample_alchemy_child"
    }));
    const serialized = JSON.stringify(report);
    const helperSource = readFileSync("src/lifeStorylines/DevLifeStorylineDebugReport.ts", "utf8");
    const screenSource = readFileSync("src/app/screens/DevLifeStorylinesScreen.tsx", "utf8");

    for (const text of [serialized, markup]) {
      expect(text).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
      expect(text).not.toContain("trueName");
      expect(text).not.toContain("true_name");
      expect(text).not.toContain("truename");
    }
    for (const source of [helperSource, screenSource]) {
      expect(source).not.toContain("Math.random");
      expect(source).not.toContain("Date.now");
      expect(source).not.toContain("performance.now");
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("../sim/");
      expect(source).not.toContain("../../sim/");
    }
  });
});
