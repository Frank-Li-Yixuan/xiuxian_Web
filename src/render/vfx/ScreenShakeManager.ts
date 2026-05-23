import type { ScreenShakeProfilesData, ShakeProfileId } from "./VfxRegistry";
import type { VisualRng } from "./ParticlePool";

export interface ScreenShakeTrigger {
  readonly profileId: ShakeProfileId;
  readonly frame: number;
  readonly nextTribulationImpactFrame?: number;
}

export interface ScreenShakeTriggerResult {
  readonly accepted: boolean;
  readonly reason?: "tribulation_protection_window";
}

export interface ScreenShakeState {
  readonly renderOnly: true;
  readonly intensityPx: number;
  readonly remainingFrames: number;
}

export interface CameraOffset {
  readonly x: number;
  readonly y: number;
}

export interface ScreenShakeManagerOptions {
  readonly profiles: ScreenShakeProfilesData;
  readonly visualRng: VisualRng;
}

interface ActiveShake {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly initialIntensityPx: number;
  readonly phase: number;
  readonly decay: string;
}

const TRIBULATION_PROTECTION_FRAMES = 30;

export class ScreenShakeManager {
  private readonly profiles: ScreenShakeProfilesData;
  private readonly visualRng: VisualRng;
  private activeShake: ActiveShake | undefined;

  public constructor(options: ScreenShakeManagerOptions) {
    this.profiles = options.profiles;
    this.visualRng = options.visualRng;
    if (this.profiles.renderOnly !== true) {
      throw new Error("screen shake profiles must be marked renderOnly");
    }
  }

  public trigger(trigger: ScreenShakeTrigger): ScreenShakeTriggerResult {
    validateFrame(trigger.frame);

    if (isInsideTribulationProtection(trigger.frame, trigger.nextTribulationImpactFrame)) {
      return Object.freeze({ accepted: false, reason: "tribulation_protection_window" });
    }

    const profile = this.profiles.profiles[trigger.profileId];
    if (profile === undefined) {
      throw new Error(`Unknown screen shake profile: ${trigger.profileId}`);
    }

    const sampledIntensity = sampleRange(profile.intensityPx, this.visualRng);
    const sampledDuration = Math.round(sampleRange(profile.durationFrames, this.visualRng));
    const current = this.getState(trigger.frame);
    const currentEndFrame = this.activeShake?.endFrame ?? trigger.frame;
    const intensityPx = Math.max(current.intensityPx, sampledIntensity);
    const endFrame = Math.max(currentEndFrame, trigger.frame + sampledDuration);

    this.activeShake = {
      startFrame: trigger.frame,
      endFrame,
      initialIntensityPx: intensityPx,
      phase: this.visualRng.next01() * Math.PI * 2,
      decay: profile.decay
    };

    return Object.freeze({ accepted: true });
  }

  public getState(frame: number): ScreenShakeState {
    validateFrame(frame);
    const shake = this.activeShake;
    if (shake === undefined || frame >= shake.endFrame) {
      return Object.freeze({ renderOnly: true, intensityPx: 0, remainingFrames: 0 });
    }

    const duration = Math.max(1, shake.endFrame - shake.startFrame);
    const elapsed = Math.max(0, frame - shake.startFrame);
    const progress01 = Math.min(1, elapsed / duration);
    const decayMultiplier = applyDecay(1 - progress01, shake.decay);
    const intensityPx = round3(shake.initialIntensityPx * decayMultiplier);

    return Object.freeze({
      renderOnly: true,
      intensityPx,
      remainingFrames: Math.max(0, shake.endFrame - frame)
    });
  }

  public getCameraOffset(frame: number): CameraOffset {
    const state = this.getState(frame);
    const phase = this.activeShake?.phase ?? 0;
    const angle = phase + frame * 0.73;

    return Object.freeze({
      x: round3(Math.cos(angle) * state.intensityPx),
      y: round3(Math.sin(angle) * state.intensityPx)
    });
  }
}

function isInsideTribulationProtection(frame: number, impactFrame: number | undefined): boolean {
  if (impactFrame === undefined) {
    return false;
  }
  const framesUntilImpact = impactFrame - frame;
  return framesUntilImpact >= 0 && framesUntilImpact <= TRIBULATION_PROTECTION_FRAMES;
}

function sampleRange(range: readonly number[], visualRng: VisualRng): number {
  const min = range[0];
  const max = range[1];
  if (min === undefined || max === undefined) {
    throw new Error("screen shake numeric ranges must contain min and max");
  }
  return min + (max - min) * visualRng.next01();
}

function applyDecay(remaining01: number, decay: string): number {
  switch (decay) {
    case "linear":
      return remaining01;
    case "easeOut":
      return remaining01 * remaining01;
    case "easeOutCubic":
      return remaining01 * remaining01 * remaining01;
    default:
      throw new Error(`Unknown screen shake decay curve: ${decay}`);
  }
}

function validateFrame(frame: number): void {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("screen shake frame must be a non-negative integer");
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
