import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevLifeStorylinesScreen } from "../../src/app/screens/DevLifeStorylinesScreen";
import {
  buildDevLifeStorylinesReport,
  DEV_LIFE_STORYLINE_SAMPLE_IDS
} from "../../src/lifeStorylines/DevLifeStorylineDebugReport";

const FORBIDDEN_HIDDEN_TRUE_NAME_TERMS = [
  "古雷真血",
  "丹圣遗骨",
  "系统共鸣体",
  "前世剑魄",
  "魔印微痕",
  "太阴残脉",
  "龙骨未醒",
  "天书残页",
  "域外战场回响",
  "功德种子"
] as const;

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
    expect(markup).toContain("药铺丹修型");
    expect(markup).toContain("废灵剑影型");
    expect(markup).toContain("月梦魂影型");
    expect(markup).toContain("天妒雷修型");
    expect(markup).toContain("山村灾劫型");
    expect(markup).toContain("苟道潜修型");
    expect(markup).toContain("魔心禁忌型");
    expect(markup).toContain("activeStorylines");
    expect(markup).toContain("score breakdown");
    expect(markup).toContain("eventThreads");
    expect(markup).toContain("progress");
    expect(markup).toContain("tension");
    expect(markup).toContain("clarity");
    expect(markup).toContain("risk");
    expect(markup).toContain("playInterludeCandidateHooks");
    expect(markup).toContain("transitionCandidateHooks");
    expect(markup).not.toContain("true_name");
    expect(markup).not.toContain("truename");
    expect(markup).not.toMatch(/trueName(?!Revealed)/);
    expect(markup).toContain("trueNameRevealed");
    expectHiddenTrueNameTermsAbsent(markup);
  });

  it("builds deterministic frozen reports for all seven samples with expected storyline/thread ids", () => {
    expect(DEV_LIFE_STORYLINE_SAMPLE_IDS).toEqual([
      "sample_alchemy_child",
      "sample_waste_sword",
      "sample_yin_dream",
      "sample_thunder_talent",
      "sample_village_calamity",
      "sample_cautious_seclusion",
      "sample_forbidden_demon_heart"
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
      },
      sample_cautious_seclusion: {
        topStorylineId: "storyline_taoist_incense",
        threadId: "thread_incense_sweeping"
      },
      sample_forbidden_demon_heart: {
        topStorylineId: "storyline_yin_dream_soul",
        threadId: "thread_heart_demon_shadow"
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
      expect(first.downstreamActiveStorylineIds.length).toBeGreaterThanOrEqual(1);
      expect(first.downstreamActiveStorylineIds.length).toBeLessThanOrEqual(3);
      expect(first.eventThreads.every((thread) =>
        first.downstreamActiveStorylineIds.includes(thread.storylineId)
      )).toBe(true);
      expectHiddenTrueNameTermsAbsent(JSON.stringify(first));
    }
  });

  it("renders the village calamity crisis sample with crisis thread and interlude candidates", () => {
    const report = buildDevLifeStorylinesReport("sample_village_calamity");
    const markup = renderToStaticMarkup(createElement(DevLifeStorylinesScreen, {
      initialSampleId: "sample_village_calamity"
    }));

    expect(report.sample.label).toBe("山村灾劫型");
    expect(report.activeStorylines.map((storyline) => storyline.storylineId)).toContain("storyline_village_calamity");
    expect(report.downstreamActiveStorylineIds).toContain("storyline_village_calamity");
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

  it("keeps cautious seclusion downstream selection away from unsupported system prelude", () => {
    const report = buildDevLifeStorylinesReport("sample_cautious_seclusion");

    expect(report.sample.label).toBe("苟道潜修型");
    expect(report.scoring.storylines[0]?.storylineId).toBe("storyline_taoist_incense");
    expect(report.downstreamActiveStorylineIds).toContain("storyline_taoist_incense");
    expect(report.downstreamActiveStorylineIds).not.toContain("storyline_system_prelude");
    expect(report.eventThreads.map((thread) => thread.storylineId)).toContain("storyline_taoist_incense");
  });

  it("keeps forbidden demon-heart sample public-safe while selecting yin or heart-demon related downstream", () => {
    const report = buildDevLifeStorylinesReport("sample_forbidden_demon_heart");
    const markup = renderToStaticMarkup(createElement(DevLifeStorylinesScreen, {
      initialSampleId: "sample_forbidden_demon_heart"
    }));

    expect(report.sample.label).toBe("魔心禁忌型");
    expect(report.downstreamActiveStorylineIds).toContain("storyline_yin_dream_soul");
    expect(report.eventThreads.map((thread) => thread.threadId)).toContain("thread_heart_demon_shadow");
    expectHiddenTrueNameTermsAbsent(JSON.stringify(report));
    expectHiddenTrueNameTermsAbsent(markup);
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
      expect(text).not.toContain("true_name");
      expect(text).not.toContain("truename");
      expect(text).not.toMatch(/trueName(?!Revealed)/);
      expect(text).toContain("trueNameRevealed");
      expectHiddenTrueNameTermsAbsent(text);
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

function expectHiddenTrueNameTermsAbsent(text: string): void {
  for (const term of FORBIDDEN_HIDDEN_TRUE_NAME_TERMS) {
    expect(text).not.toContain(term);
  }
}
