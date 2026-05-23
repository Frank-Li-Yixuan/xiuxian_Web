import { describe, expect, it } from "vitest";

import {
  buildPlayerLoadoutFromProfile,
  listAvailableLoadoutPresets,
  type LoadoutPresetPack
} from "../../src/outgame/LoadoutBuilder";
import { createSecondRunConfig, type RunConfigTemplate } from "../../src/outgame/RunConfigFactory";
import { cloneOutgameProfile, type OutgameProfileState } from "../../src/outgame/ProfileState";
import defaultProfileData from "../../data/outgame/default_profile.v0.1.json";
import loadoutPresetData from "../../data/outgame/loadout_presets.v0.1.json";
import debugRunConfigData from "../../data/run/debug_run_config.v0.1.json";

const DEFAULT_PROFILE = defaultProfileData as unknown as OutgameProfileState;
const PRESETS = loadoutPresetData as unknown as LoadoutPresetPack;
const DEBUG_RUN_CONFIG = debugRunConfigData as unknown as RunConfigTemplate;

describe("Loadout builder and second run config", () => {
  it("lists the three v0.1 loadout presets and filters unavailable slots from the profile", () => {
    const profile = cloneOutgameProfile(DEFAULT_PROFILE);

    expect(listAvailableLoadoutPresets(PRESETS).map((preset) => preset.id)).toEqual([
      "preset_safe_push",
      "preset_fire_clear",
      "preset_coop_guardian"
    ]);

    const safePush = buildPlayerLoadoutFromProfile({
      profile,
      presets: PRESETS,
      presetId: "preset_safe_push",
      playerId: "p1"
    });

    expect(safePush).toEqual(
      expect.objectContaining({
        playerId: "p1",
        presetId: "preset_safe_push",
        mainMethodId: "method_turtle_breath",
        natalArtifact: { itemId: "artifact_qingshuang_sword", star: 1 },
        spiritTreasures: [{ itemId: "treasure_bagua_jade", star: 1 }, null],
        spellIds: ["spell_five_thunder", "spell_bagua_sword_ring", null, null],
        spellLevels: { spell_five_thunder: 1, spell_bagua_sword_ring: 1 },
        pillIds: ["pill_rejuvenation", null, null]
      })
    );
  });

  it("supports fire-clear and coop-guardian presets when the profile has unlocked inventory", () => {
    const profile = createSecondRunProfile();

    const fireClear = buildPlayerLoadoutFromProfile({
      profile,
      presets: PRESETS,
      presetId: "preset_fire_clear",
      playerId: "p1"
    });
    expect(fireClear).toEqual(
      expect.objectContaining({
        mainMethodId: "method_pure_yang",
        natalArtifact: { itemId: "artifact_ziyang_gourd", star: 1 },
        spiritTreasures: [
          { itemId: "treasure_minor_sword_array", star: 1 },
          { itemId: "treasure_gold_toad", star: 1 }
        ],
        spellIds: ["spell_red_lotus_fire", "spell_five_thunder", null, null],
        spellLevels: { spell_red_lotus_fire: 1, spell_five_thunder: 2 },
        pillIds: ["pill_burning_blood", "pill_rejuvenation", null]
      })
    );

    const coopGuardian = buildPlayerLoadoutFromProfile({
      profile,
      presets: PRESETS,
      presetId: "preset_coop_guardian",
      playerId: "p2"
    });
    expect(coopGuardian).toEqual(
      expect.objectContaining({
        playerId: "p2",
        mainMethodId: "method_turtle_breath",
        natalArtifact: { itemId: "artifact_qingshuang_sword", star: 2 },
        spiritTreasures: [
          { itemId: "treasure_tongxin_lock", star: 1 },
          { itemId: "treasure_bagua_jade", star: 1 }
        ],
        spellIds: ["spell_bagua_sword_ring", "spell_sleeve_universe", "spell_five_thunder", null],
        spellLevels: { spell_bagua_sword_ring: 1, spell_sleeve_universe: 1, spell_five_thunder: 2 },
        pillIds: ["pill_rejuvenation", "pill_clear_mind", "pill_rejuvenation"]
      })
    );
  });

  it("creates a deterministic second-run config where upgrades and mastery increase opening power", () => {
    const firstRunLoadout = buildPlayerLoadoutFromProfile({
      profile: cloneOutgameProfile(DEFAULT_PROFILE),
      presets: PRESETS,
      presetId: "preset_safe_push",
      playerId: "p1"
    });
    const secondRunProfile = createSecondRunProfile();
    const secondRun = createSecondRunConfig({
      profile: secondRunProfile,
      presets: PRESETS,
      baseRunConfig: DEBUG_RUN_CONFIG,
      presetId: "preset_safe_push",
      runId: "second_run_stage01_seed_20260523",
      seed: 20260523,
      playerIds: ["p1"]
    });

    expect(secondRun).toEqual(
      expect.objectContaining({
        schema: "RunConfig",
        version: "0.1",
        runId: "second_run_stage01_seed_20260523",
        seed: 20260523,
        difficulty: "normal",
        stageId: "stage_01_qingyun"
      })
    );
    expect(secondRun.players.p1).toEqual(
      expect.objectContaining({
        selectedMainMethodId: "method_turtle_breath",
        natalArtifactId: "artifact_qingshuang_sword",
        artifactStars: { artifact_qingshuang_sword: 2 },
        spiritTreasureIds: ["treasure_bagua_jade", "treasure_gold_toad"],
        treasureStars: { treasure_bagua_jade: 1, treasure_gold_toad: 1 },
        spellIds: ["spell_five_thunder", "spell_bagua_sword_ring", null, null],
        spellLevels: { spell_five_thunder: 2, spell_bagua_sword_ring: 1 },
        pillIds: ["pill_rejuvenation", "pill_clear_mind", null],
        startingRealmId: "realm_qi_refining",
        startingLayer: 1
      })
    );
    expect(secondRun.players.p1?.baseStats.jing).toBeGreaterThan(DEBUG_RUN_CONFIG.players.p1.baseStats.jing);
    expect(secondRun.players.p1?.openingPowerScore).toBeGreaterThan(firstRunLoadout.openingPowerScore);
  });
});

function createSecondRunProfile(): OutgameProfileState {
  const profile = cloneOutgameProfile(DEFAULT_PROFILE);
  return cloneOutgameProfile({
    ...profile,
    pills: {
      ...profile.pills,
      rejuvenation_pill: 2,
      burning_blood_pill: 1,
      clear_mind_pill: 1
    },
    methods: {
      ...profile.methods,
      method_turtle_breath: { unlocked: true, level: 2, trainingProgress: 0 },
      method_pure_yang: { unlocked: true, level: 1, trainingProgress: 0 }
    },
    spells: {
      ...profile.spells,
      spell_five_thunder: { unlocked: true, masteryLevel: 2 },
      spell_bagua_sword_ring: { unlocked: true, masteryLevel: 1 },
      spell_red_lotus_fire: { unlocked: true, masteryLevel: 1 },
      spell_sleeve_universe: { unlocked: true, masteryLevel: 1 }
    },
    artifacts: {
      ...profile.artifacts,
      artifact_qingshuang_sword: { unlocked: true, star: 2 },
      artifact_ziyang_gourd: { unlocked: true, star: 1 }
    },
    treasures: {
      ...profile.treasures,
      treasure_minor_sword_array: { unlocked: true, star: 1 },
      treasure_bagua_jade: { unlocked: true, star: 1 },
      treasure_gold_toad: { unlocked: true, star: 1 },
      treasure_tongxin_lock: { unlocked: true, star: 1 }
    }
  });
}
