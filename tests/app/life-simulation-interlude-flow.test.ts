import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildLifeInterludeUiResultSummary,
  sanitizeLifeInterludeUiText
} from "../../src/app/screens/life-simulation/LifeInterludeUiViewModel";
import { LifeSimulationScreen } from "../../src/app/screens/LifeSimulationScreen";
import type { LifeInterludeCandidate, LifeInterludeRunConfig } from "../../src/types/life-interlude-types.v0.1";
import type { LifeSimulationState, MonthlyLifeLogEntry, PendingLifeInterludeState } from "../../src/types/life-monthly-events-types.v0.1";

const HIDDEN_TRUE_NAME_TERMS = [
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

describe("LifeSimulationScreen interlude UI flow", () => {
  it("renders a public-safe confirmation dialog for pending interludes", () => {
    const markup = renderToStaticMarkup(
      createElement(LifeSimulationScreen, {
        lifeSimulationState: makeScreenLifeState({
          pendingInterlude: makePendingInterlude()
        })
      })
    );

    expect(markup).toContain('data-life-interlude-confirm-dialog="true"');
    expect(markup).toContain('data-pending-life-interlude="lpi_run_screen"');
    expect(markup).toContain('data-result-writeback-id="writeback_medicine_field"');
    expect(markup).toContain('data-interlude-confirm-action="manualChallenge"');
    expect(markup).toContain('data-interlude-confirm-action="autoResolve"');
    expect(markup).toContain('data-interlude-confirm-action="backToChoice"');
    expect(markup).toContain("interlude_guard_medicine_field");
    expect(markup).toContain("horde");
    expect(markup).toContain("risk");
    expect(markup).toContain("180s");
    expectPublicSafe(markup);
  });

  it("renders transition state without resolving through timers", () => {
    const markup = renderToStaticMarkup(
      createElement(LifeSimulationScreen, {
        interludeUiPhase: "transition",
        lifeSimulationState: makeScreenLifeState({
          pendingInterlude: makePendingInterlude()
        })
      })
    );

    expect(markup).toContain('data-life-interlude-transition="manualChallenge"');
    expect(markup).toContain('data-life-interlude-transition-mode="horde"');
    expect(markup).toContain('data-life-interlude-transition-risk="risk"');
    expect(markup).toContain('data-life-interlude-transition-source="thread_apothecary_sorting_herbs"');
    expect(markup).toContain("public world explanation");
    expect(markup).toContain('data-life-interlude-transition-action="resolve"');
    expect(markup).not.toContain("setTimeout");
    expectPublicSafe(markup);
  });

  it("renders public-safe result summary with outcome, logs, changed state, and hook hints", () => {
    const before = makeScreenLifeState({
      pendingInterlude: makePendingInterlude()
    });
    const after = makeScreenLifeState({
      lifeSkills: {
        ...makeScreenLifeState().lifeSkills,
        alchemy: 3
      },
      merit: 2,
      wounds: [
        {
          id: "wound_thunder_singe",
          name: "Thunder singe",
          severity: 2,
          createdAtMonth: 150,
          tags: ["storm"]
        }
      ],
      heartKnots: [
        {
          id: "knot_furnace_memory",
          name: "Furnace memory",
          severity: 1,
          createdAtMonth: 150,
          tags: ["furnace"]
        }
      ],
      monthlyLogs: [
        makeMonthlyLog({
          hooks: ["public_hook", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
          visibleEffectSummary: ["Alchemy +3", "trueName SHOULD_NOT_LEAK_HIDDEN_NAME"]
        })
      ]
    });
    const summary = buildLifeInterludeUiResultSummary(before, after, makePendingInterlude(), "manualChallenge");
    const markup = renderToStaticMarkup(
      createElement(LifeSimulationScreen, {
        interludeResultSummary: summary,
        interludeUiPhase: "result",
        lifeSimulationState: after
      })
    );

    expect(summary.outcome).toBe("success");
    expect(summary.statChanges).toContain("lifeSkills.alchemy +3");
    expect(summary.statChanges).toContain("merit +2");
    expect(summary.woundChanges).toContain("wound_thunder_singe severity 2");
    expect(summary.heartKnotChanges).toContain("knot_furnace_memory severity 1");
    expect(summary.hookHints).toContain("public_hook");
    expect(summary.hookHints).not.toContain("trueName:SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(markup).toContain('data-life-interlude-result-panel="true"');
    expect(markup).toContain('data-life-interlude-result-outcome="success"');
    expect(markup).toContain("lifeSkills.alchemy +3");
    expect(markup).toContain("wound_thunder_singe severity 2");
    expect(markup).toContain("public_hook");
    expect(markup).toContain('data-life-interlude-result-action="return"');
    expectPublicSafe(JSON.stringify(summary).replaceAll("trueNameRevealed", ""));
    expectPublicSafe(markup);
  });

  it("keeps close and back paths mapped to backToChoice", () => {
    const screenSource = readFileSync(join(process.cwd(), "src/app/screens/LifeSimulationScreen.tsx"), "utf8");
    const dialogSource = readFileSync(join(process.cwd(), "src/app/screens/life-simulation/InterludeFlowViews.tsx"), "utf8");

    expect(screenSource).toContain("InterludeConfirmDialog");
    expect(dialogSource).toContain("onOpenChange");
    expect(screenSource).toContain('onResolveInterlude?.("backToChoice")');
    expect(screenSource).not.toContain("GeneratedPanel");
    expect(screenSource).not.toContain("GeneratedFrame");
    expect(screenSource).not.toContain("GeneratedImageButton");
    expect(dialogSource).not.toContain("GeneratedImageButton");
  });

  it("sanitizes hidden-name text but preserves trueNameRevealed boolean labels", () => {
    expect(sanitizeLifeInterludeUiText("trueName:SHOULD_NOT_LEAK_HIDDEN_NAME")).toBe("public-safe");
    expect(sanitizeLifeInterludeUiText("丹圣遗骨")).toBe("public-safe");
    expect(sanitizeLifeInterludeUiText("trueNameRevealed: false")).toBe("trueNameRevealed: false");
  });
});

function makePendingInterlude(): PendingLifeInterludeState {
  return {
    sourceMajorChoiceEventInstanceId: "major_choice_lpi_c006",
    sourceOptionInstanceId: "choice_interlude",
    candidate: makeScreenInterludeCandidate(),
    runConfig: makeScreenRunConfig(),
    status: "pending"
  };
}

function makeScreenInterludeCandidate(): LifeInterludeCandidate {
  return {
    definitionId: "interlude_guard_medicine_field",
    mode: "horde",
    name: "Guard medicine field",
    difficultyTier: "risky",
    displayRisk: "risk",
    durationPreview: "180s",
    worldExplanation: "public world explanation",
    autoResolveAllowed: true,
    finalWeight: 80
  };
}

function makeScreenRunConfig(): LifeInterludeRunConfig {
  return {
    interludeRunId: "lpi_run_screen",
    definitionId: "interlude_guard_medicine_field",
    mode: "horde",
    seed: "screen-seed",
    ageMonth: 150,
    sourceChoiceId: "choice_interlude",
    sourceThreadId: "thread_apothecary_sorting_herbs",
    resultWritebackId: "writeback_medicine_field",
    difficultyTier: "risky",
    durationTargetSeconds: 180,
    playerProjection: {
      maxHp: 70,
      maxQi: 35,
      moveSpeed: 3.4,
      skillTags: [],
      destinyModifiers: [],
      itemModifiers: []
    },
    scenario: {
      title: "Guard medicine field",
      description: "public scenario",
      worldExplanation: "public world explanation",
      enemyPool: ["horde:survival_wave"]
    },
    rewards: {
      successEffects: [],
      failureEffects: []
    },
    failurePolicy: {
      canGameOver: false,
      preserveLifeSimulation: true,
      autoResolveFallback: "success"
    }
  };
}

function makeMonthlyLog(overrides: Partial<MonthlyLifeLogEntry> = {}): MonthlyLifeLogEntry {
  return {
    ageMonth: 150,
    ageYear: 12,
    ageMonthInYear: 6,
    phaseId: "youth",
    eventId: "interlude_result",
    eventTitle: "Interlude result",
    eventDescription: "public interlude result",
    outcome: "normal",
    visibleEffectSummary: [],
    tags: [],
    hooks: [],
    ...overrides
  };
}

function makeScreenLifeState(overrides: Partial<LifeSimulationState> = {}): LifeSimulationState {
  return {
    profileId: "profile_screen",
    characterId: "character_screen",
    seed: "screen-seed",
    rngState: {},
    ageMonths: 150,
    phaseId: "youth",
    core: { jing: 50, qi: 50, shen: 50 },
    aptitude: {
      rootBone: 50,
      comprehension: 50,
      inspiration: 50,
      fortune: 50,
      heart: 50,
      lifespan: 50
    },
    lifeSkills: {
      study: 0,
      martial: 0,
      alchemy: 0,
      craft: 0,
      social: 0,
      stealth: 0,
      ritual: 0,
      survival: 0
    },
    karma: 0,
    merit: 0,
    heartDemon: 0,
    wounds: [],
    heartKnots: [],
    family: {
      kinship: 50,
      familyStrain: 0,
      familyWealth: 0,
      flags: {}
    },
    relationships: [],
    hiddenFateProgress: {},
    carriedItemAffinity: {},
    flags: {},
    monthlyLogs: [],
    ...overrides
  };
}

function expectPublicSafe(text: string): void {
  expect(text).not.toContain("true_name");
  expect(text).not.toContain("truename");
  expect(text).not.toContain("hiddenFateInternal");
  expect(text).not.toMatch(/trueName(?!Revealed)/);
  for (const term of HIDDEN_TRUE_NAME_TERMS) {
    expect(text).not.toContain(term);
  }
}
