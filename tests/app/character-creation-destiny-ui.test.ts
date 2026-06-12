import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CharacterCreationScreen } from "../../src/app/screens/CharacterCreationScreen";
import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { GeneratedUiAssetId, GeneratedUiAssetRegistry } from "../../src/assets/generatedUiAssets";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningDraftTags,
  OpeningGenerator,
  OpeningInnateDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("CharacterCreationScreen destiny reroll UI", () => {
  it("renders DT-C004 reroll metadata in the existing DOM layout without PNG control imports", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-screen" });
    const draft = controller.generate({ slotId: "slot_destiny_ui", nowMs: 1_000 });

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        nowMs: () => 1_000
      })
    );
    const source = readFileSync(join(process.cwd(), "src/app/screens/CharacterCreationScreen.tsx"), "utf8");

    expect(markup).toContain("天机值");
    expect(markup).toContain("剩余锁");
    expect(markup).toContain("天机推演");
    expect(markup).toContain(draft.destinies.main.name);
    const altarCaption = markup.match(/<div class="ccui2-altar-caption">[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(altarCaption).toContain(draft.openingInnateDraft.spiritualRoot.displayName);
    expect(altarCaption).not.toContain(draft.destinies.main.name);
    expect(markup).toContain('data-lock-key="none"');
    expect(markup).toContain('data-lock-state="unavailable"');
    expect(markup).toContain('data-reroll-enabled="true"');
    expect(markup).toContain('data-divination-enabled="true"');
    expect(markup).toContain('data-detail-target="stats"');
    expect(markup).toContain('data-detail-target="root"');
    expect(markup).toContain('data-detail-target="origin"');
    expect(markup).toContain('data-detail-target="items"');
    expect(markup).toContain("选择可锁定项");
    expect(markup).toContain("灵根|主天命|副天命 1|副天命 2|劫命|身世|随身物");
    expect(source).not.toMatch(/from\s+["'][^"']*UiAssetRegistry["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetButton["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetPanel["']/);
  });

  it("renders selected destiny detail text with description, effects, warnings, and selected slot", () => {
    const controller = new CharacterCreationController({ seed: "ccui2-c004-destiny-detail" });
    const draft = controller.generate({ slotId: "slot_destiny_detail", nowMs: 1_000 });
    const selectedCard = draft.destinies.secondary[0];

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        initialActiveTab: "destiny",
        initialSelectedSlot: "secondary0",
        nowMs: () => 1_000
      })
    );
    const description = selectedCard.description ?? "";

    expect(markup).toContain('data-detail-section="destiny"');
    expect(markup).toContain('data-selected-detail-slot="secondary0"');
    expect(markup).toContain(selectedCard.name);
    expect(description.length).toBeGreaterThan(0);
    expect(markup).toContain(description);
    for (const effect of selectedCard.positiveEffects) {
      expect(markup).toContain(effect);
    }
    for (const effect of selectedCard.negativeEffects) {
      expect(markup).toContain(effect);
    }
  });

  it("renders nine-palace destiny alignment labels without hidden fate leakage", () => {
    const controller = new CharacterCreationController({ seed: "npf-c004-screen-alignment" });
    const draft = controller.generate({ slotId: "slot_npf_c004_ui", nowMs: 1_000 });

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        initialActiveTab: "destiny",
        nowMs: () => 1_000
      })
    );

    expect(markup).toContain("命盘相合");
    expect(markup).not.toContain("trueName");
    expect(markup).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });

  it("renders DEM-C006 destiny v2 life impact and mode projection detail sections", () => {
    const originRegistry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({
      seed: "dem-c006-screen-projection",
      openingGenerator: new FixedOpeningGenerator(makeOpeningDraft({
        jing: 60,
        qi: 70,
        shen: 70,
        rootBone: 60,
        comprehension: 95,
        inspiration: 95,
        fortune: 75,
        heart: 55,
        lifespan: 35
      }))
    });
    const draft = controller.generate({ slotId: "slot_dem_c006_screen_projection", nowMs: 1_000 });
    const hiddenFate = originRegistry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        initialActiveTab: "destiny",
        initialSelectedSlot: "main",
        nowMs: () => 1_000
      })
    );

    expect(markup).toContain('data-destiny-life-impact="true"');
    expect(markup).toContain("early_speech_or_scripture");
    expect(markup).toContain('data-destiny-mode-projection="outerBattlefield"');
    expect(markup).toContain("first_insight_quality_plus_1");
    expect(markup).toContain('data-destiny-mode-projection="deckbuilder"');
    expect(markup).toContain("rare_card_weight_up");
    expect(markup).not.toContain(hiddenFate.trueName);
    expect(markup).not.toContain("trueName");
    expect(markup).not.toContain("hiddenFateInternal");
    expect(markup).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });

  it("renders MIG-C003 v0.2 summaries and safe mutation explanation without source debug ids", () => {
    const originRegistry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({
      seed: "dem-c006-screen-mutation",
      openingGenerator: new FixedOpeningGenerator(makeOpeningDraft({
        jing: 60,
        qi: 60,
        shen: 60,
        rootBone: 60,
        comprehension: 40,
        inspiration: 40,
        fortune: 60,
        heart: 60,
        lifespan: 60
      }))
    });
    const draft = controller.generate({ slotId: "slot_dem_c006_screen_mutation", nowMs: 1_000 });
    const hiddenFate = originRegistry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        initialActiveTab: "destiny",
        initialSelectedSlot: "main",
        nowMs: () => 1_000
      })
    );
    const cardRow = markup.match(/<section class="ccui2-destiny-card-row"[\s\S]*?<\/section>/)?.[0] ?? "";

    expect(markup).toContain(draft.destinies.main.name);
    expect(markup).toContain("原始天机产生偏转");
    expect(markup).toContain('data-character-v02-nine-palace="true"');
    expect(markup).toContain('data-character-v02-destiny-evaluation="true"');
    expect(markup).toContain('data-character-v02-origin-chain="true"');
    expect(markup).toContain('data-character-v02-carried-item="true"');
    expect(markup).toContain('data-character-v02-life-storyline="true"');
    expect(markup).not.toContain('data-destiny-mutation-source="true"');
    expect(markup).not.toContain("destiny_heaven_jealous_talent");
    expect(markup).not.toContain("mutation:anti_result");
    expect(cardRow).not.toContain("destiny_heaven_jealous_talent");
    expect(markup).not.toContain(hiddenFate.trueName);
    expect(markup).not.toContain("trueName");
    expect(markup).not.toContain("hiddenFateInternal");
    expect(markup).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });
});

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}

class FixedOpeningGenerator implements OpeningGenerator {
  constructor(private readonly draft: OpeningInnateDraft) {}

  generate(input: GenerateOpeningInnateInput): OpeningInnateDraft {
    return {
      ...this.draft,
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      ...(input.locks === undefined ? {} : { locks: input.locks })
    };
  }
}

function makeOpeningDraft(attributes: NinePalaceAttributes): OpeningInnateDraft {
  const ninePalaceEvaluation = evaluateNinePalace(attributes);
  const tags: OpeningDraftTags = {
    destinyBiasTags: ninePalaceEvaluation.tags.destinyBiasTags,
    lifeEventBiasTags: ninePalaceEvaluation.tags.lifeEventBiasTags,
    hiddenFateBiasTags: ninePalaceEvaluation.tags.hiddenFateBiasTags,
    modeBiasTags: ninePalaceEvaluation.tags.modeBiasTags
  };

  return {
    draftId: "draft_dem_c006_ui",
    seed: "fixed_opening",
    rerollIndex: 0,
    archetype: {
      id: "fixed_archetype",
      name: "Fixed Archetype",
      description: "Test fixture",
      tags: []
    },
    aptitude: {
      rootBone: attributes.rootBone,
      comprehension: attributes.comprehension,
      inspiration: attributes.inspiration,
      fortune: attributes.fortune,
      heart: attributes.heart,
      lifespan: attributes.lifespan
    },
    coreSeed: {
      jing: attributes.jing,
      qi: attributes.qi,
      shen: attributes.shen
    },
    spiritualRoot: {
      categoryId: "single",
      displayName: "Fixed Root",
      elements: { thunder: 100 },
      primaryElement: "thunder",
      secondaryElements: [],
      purity: 80,
      stability: 70,
      conflict: 10,
      breadth: 20,
      relationTags: [],
      tags: ["root:thunder"]
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags,
    ninePalaceEvaluation,
    distinctivenessScore: 0
  };
}
