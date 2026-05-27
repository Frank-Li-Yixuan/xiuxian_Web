import { describe, expect, it } from "vitest";

import { AudioBus, type AudioBusAudioElement } from "../../src/audio/AudioBus";
import { CombatAudioAssetRegistry, type CombatAudioManifest } from "../../src/assets/CombatAssetRegistry";

describe("AudioBus", () => {
  it("applies cooldowns, group volume, and group mute without creating duplicate playback", () => {
    const factory = new FakeAudioFactory();
    const clock = new FakeClock();
    const bus = new AudioBus({ registry: createRegistry(), audioFactory: factory.create, clock, unlocked: true });

    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: true }));
    expect(factory.created[0]?.volume).toBeCloseTo(0.5);

    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: false, reason: "cooldown" }));

    clock.advance(60);
    bus.setGroupVolume("combat", 0.25);
    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: true }));
    expect(factory.created[1]?.volume).toBeCloseTo(0.125);

    clock.advance(60);
    bus.setGroupMuted("combat", true);
    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: false, reason: "group_muted" }));
  });

  it("enforces maxInstances and lets higher-priority cues preempt lower-priority voices", () => {
    const factory = new FakeAudioFactory();
    const clock = new FakeClock();
    const bus = new AudioBus({ registry: createRegistry(), audioFactory: factory.create, clock, unlocked: true, maxActiveInstances: 1 });

    expect(bus.play({ assetId: "sfx.hit.enemy_light_01", priority: "low" })).toEqual(expect.objectContaining({ played: true }));

    clock.advance(60);
    expect(bus.play({ assetId: "sfx.death.enemy_small_burst_01", priority: "low" })).toEqual(
      expect.objectContaining({ played: false, reason: "max_instances" })
    );

    expect(bus.play({ assetId: "sfx.warning.boss_tribulation_01", priority: "critical" })).toEqual(expect.objectContaining({ played: true }));
    expect(factory.created[0]?.paused).toBe(true);
    expect(factory.created[1]?.src).toBe("/assets/audio/combat/boss_tribulation_warning_01.ogg");
    expect(bus.getStatus().activeInstances).toBe(1);
  });

  it("uses deterministic round-robin variant selection and stops looped assets", () => {
    const factory = new FakeAudioFactory();
    const bus = new AudioBus({ registry: createRegistry(), audioFactory: factory.create, clock: new FakeClock(), unlocked: true });

    expect(bus.play({ assetId: ["sfx.hit.enemy_light_01", "sfx.death.enemy_small_burst_01"] })).toEqual(
      expect.objectContaining({ played: true, assetId: "sfx.hit.enemy_light_01" })
    );
    expect(bus.play({ assetId: ["sfx.hit.enemy_light_01", "sfx.death.enemy_small_burst_01"] })).toEqual(
      expect.objectContaining({ played: true, assetId: "sfx.death.enemy_small_burst_01" })
    );

    expect(bus.play({ assetId: "ambience.outer_battlefield_loop_01" })).toEqual(expect.objectContaining({ played: true }));
    expect(factory.created[2]?.loop).toBe(true);

    bus.stopAsset("ambience.outer_battlefield_loop_01");
    expect(factory.created[2]?.paused).toBe(true);
    expect(bus.getStatus().activeInstances).toBe(2);
  });

  it("drops requests while locked or disabled", () => {
    const bus = new AudioBus({ registry: createRegistry(), audioFactory: new FakeAudioFactory().create, clock: new FakeClock(), unlocked: false });

    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: false, reason: "locked" }));

    bus.unlock();
    bus.setEnabled(false);
    expect(bus.play({ assetId: "sfx.hit.enemy_light_01" })).toEqual(expect.objectContaining({ played: false, reason: "disabled" }));
  });
});

class FakeClock {
  private currentMs = 0;

  public now = (): number => this.currentMs;

  public advance(ms: number): void {
    this.currentMs += ms;
  }
}

class FakeAudio implements AudioBusAudioElement {
  public currentTime = 0;
  public loop = false;
  public onended: HTMLAudioElement["onended"] = null;
  public onerror: HTMLAudioElement["onerror"] = null;
  public paused = true;
  public volume = 1;

  public constructor(public src: string) {}

  public async play(): Promise<void> {
    this.paused = false;
  }

  public pause(): void {
    this.paused = true;
  }
}

class FakeAudioFactory {
  public readonly created: FakeAudio[] = [];

  public create = (src: string): FakeAudio => {
    const audio = new FakeAudio(src);
    this.created.push(audio);
    return audio;
  };
}

function createRegistry(): CombatAudioAssetRegistry {
  return new CombatAudioAssetRegistry({
    version: "0.1",
    namespace: "assets.audio.combat",
    root: "/assets/audio/",
    assets: {
      "sfx.hit.enemy_light_01": audioAsset({
        path: "/assets/audio/combat/hit_enemy_light_01.ogg",
        category: "hit",
        mixGroup: "combat",
        durationMs: 138,
        volume: 0.5,
        cooldownMs: 50,
        maxInstances: 2
      }),
      "sfx.death.enemy_small_burst_01": audioAsset({
        path: "/assets/audio/combat/enemy_small_burst_01.ogg",
        category: "death",
        mixGroup: "combat",
        durationMs: 1059,
        volume: 0.5,
        cooldownMs: 0,
        maxInstances: 2
      }),
      "sfx.warning.boss_tribulation_01": audioAsset({
        path: "/assets/audio/combat/boss_tribulation_warning_01.ogg",
        category: "warning",
        mixGroup: "warning",
        durationMs: 682,
        volume: 0.75,
        cooldownMs: 800,
        maxInstances: 1
      }),
      "ambience.outer_battlefield_loop_01": audioAsset({
        path: "/assets/audio/ambience/outer_battlefield_loop_01.ogg",
        category: "ambience",
        mixGroup: "ambience",
        durationMs: 3202,
        volume: 0.28,
        cooldownMs: 0,
        maxInstances: 1,
        loop: true
      })
    }
  });
}

function audioAsset(overrides: Partial<CombatAudioManifest["assets"][string]>): CombatAudioManifest["assets"][string] {
  return {
    path: "/assets/audio/test.ogg",
    category: "test",
    mixGroup: "combat",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.ogg",
    durationMs: 100,
    volume: 0.5,
    cooldownMs: 0,
    maxInstances: 4,
    required: true,
    notes: "Fixture.",
    ...overrides
  };
}
