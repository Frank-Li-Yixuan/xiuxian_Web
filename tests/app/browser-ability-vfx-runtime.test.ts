import { describe, expect, it } from "vitest";

import { createBrowserGameRuntime } from "../../src/app/BrowserGameRuntime";
import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";

describe("browser runtime ability VFX presentation", () => {
  it("derives spell and pill VFX from real runtime inputs without polluting SimState", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });

    const spellSnapshot = runtime.step([input(0, "p1", InputButtonBit.Spell1), input(0, "p2", InputButtonBit.Spell1)]);
    expect(spellSnapshot.presentation.abilityVfx?.map((event) => event.sourceId)).toEqual(
      expect.arrayContaining(["spell_five_thunder", "spell_red_lotus_fire"])
    );
    expect(spellSnapshot.presentation.abilityVfx).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spell",
          sourceId: "spell_five_thunder",
          phase: "cast",
          sfxCueId: "sfx.spell.five_thunder_cast_01"
        })
      ])
    );

    const pillSnapshot = runtime.step([input(1, "p1", InputButtonBit.Pill1)]);
    expect(pillSnapshot.presentation.abilityVfx).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "pill",
          sourceId: "pill_rejuvenation",
          phase: "swallow",
          sfxCueId: "sfx.pill.rejuvenation_heal_01"
        }),
        expect.objectContaining({
          kind: "pill",
          sourceId: "pill_rejuvenation",
          phase: "digest"
        })
      ])
    );
    expect(Object.keys(pillSnapshot.simState)).not.toEqual(expect.arrayContaining(["abilityVfx", "presentation"]));
  });

  it("derives artifact hit and loadout treasure VFX from presentation-only runtime state", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523, startAtBoss: true });
    let snapshot = runtime.getSnapshot();

    expect(snapshot.presentation.abilityVfx?.map((event) => event.sourceId)).toEqual(
      expect.arrayContaining([
        "treasure_minor_sword_array",
        "treasure_gold_toad",
        "treasure_bagua_jade",
        "treasure_tongxin_lock"
      ])
    );

    let sawArtifactHit = false;
    for (let frame = 0; frame < 900 && !sawArtifactHit; frame += 1) {
      snapshot = runtime.step([input(frame, "p1", 0)]);
      sawArtifactHit = snapshot.presentation.abilityVfx?.some(
        (event) => event.kind === "artifact" && event.phase === "hit" && event.sourceId === "artifact_ziyang_gourd"
      ) === true;
    }

    expect(sawArtifactHit).toBe(true);
    expect(snapshot.presentation.abilityVfx).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "artifact",
          sourceId: "artifact_ziyang_gourd",
          phase: "hit",
          sfxCueId: "sfx.artifact.flying_sword_fire_01"
        })
      ])
    );
    expect(Object.keys(snapshot.simState)).not.toEqual(expect.arrayContaining(["abilityVfx"]));
  });
});

function input(frame: number, playerId: "p1" | "p2", pressedMask: number): FrameInput {
  return {
    frame,
    playerId,
    moveX: 0,
    moveY: 0,
    downMask: pressedMask,
    pressedMask,
    releasedMask: 0,
    inputSeq: frame + (playerId === "p1" ? 1 : 1000)
  };
}
