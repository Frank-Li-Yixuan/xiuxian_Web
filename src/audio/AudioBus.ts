import { CombatAudioAssetRegistry, type CombatAudioAssetEntry } from "../assets/CombatAssetRegistry";

export { CombatAudioAssetRegistry as AudioAssetRegistry } from "../assets/CombatAssetRegistry";

export type AudioBusPriority = "low" | "normal" | "high" | "critical";

export interface AudioBusAudioElement {
  src: string;
  volume: number;
  loop: boolean;
  currentTime: number;
  onended: HTMLAudioElement["onended"];
  onerror: HTMLAudioElement["onerror"];
  play: () => Promise<void>;
  pause: () => void;
}

export interface AudioBusPlayRequest {
  readonly assetId: string | readonly string[];
  readonly priority?: AudioBusPriority;
  readonly volumeScale?: number;
}

export interface AudioBusPlayResult {
  readonly played: boolean;
  readonly assetId?: string;
  readonly reason?: "disabled" | "locked" | "unknown_asset" | "planned" | "cooldown" | "group_muted" | "max_instances";
}

export interface AudioBusStatus {
  readonly enabled: boolean;
  readonly unlocked: boolean;
  readonly activeInstances: number;
  readonly groups: Readonly<Record<string, { readonly volume: number; readonly muted: boolean }>>;
}

export interface AudioBusOptions {
  readonly registry: CombatAudioAssetRegistry;
  readonly audioFactory?: (src: string) => AudioBusAudioElement;
  readonly clock?: { readonly now: () => number };
  readonly unlocked?: boolean;
  readonly enabled?: boolean;
  readonly maxActiveInstances?: number;
}

interface ActiveAudioInstance {
  readonly assetId: string;
  readonly mixGroup: string;
  readonly priority: AudioBusPriority;
  readonly audio: AudioBusAudioElement;
}

const DEFAULT_MAX_ACTIVE_INSTANCES = 16;
const PRIORITY_WEIGHT: Readonly<Record<AudioBusPriority, number>> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3
};

export class AudioBus {
  private readonly registry: CombatAudioAssetRegistry;
  private readonly audioFactory: (src: string) => AudioBusAudioElement;
  private readonly clock: { readonly now: () => number };
  private readonly maxActiveInstances: number;
  private readonly lastPlayedAt = new Map<string, number>();
  private readonly variantCursor = new Map<string, number>();
  private readonly groupSettings = new Map<string, { volume: number; muted: boolean }>();
  private activeInstances: ActiveAudioInstance[] = [];
  private enabled: boolean;
  private unlocked: boolean;

  public constructor(options: AudioBusOptions) {
    this.registry = options.registry;
    this.audioFactory = options.audioFactory ?? createBrowserAudioElement;
    this.clock = options.clock ?? { now: () => performance.now() };
    this.maxActiveInstances = options.maxActiveInstances ?? DEFAULT_MAX_ACTIVE_INSTANCES;
    this.enabled = options.enabled ?? true;
    this.unlocked = options.unlocked ?? true;
  }

  public unlock(): void {
    this.unlocked = true;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public setGroupVolume(mixGroup: string, volume: number): void {
    const next = { ...this.getMutableGroupSettings(mixGroup), volume: clamp01(volume) };
    this.groupSettings.set(mixGroup, next);
    this.applyGroupVolume(mixGroup);
  }

  public setGroupMuted(mixGroup: string, muted: boolean): void {
    const next = { ...this.getMutableGroupSettings(mixGroup), muted };
    this.groupSettings.set(mixGroup, next);
    if (muted) {
      this.stopGroup(mixGroup);
    } else {
      this.applyGroupVolume(mixGroup);
    }
  }

  public play(request: AudioBusPlayRequest): AudioBusPlayResult {
    if (!this.enabled) {
      return { played: false, reason: "disabled" };
    }
    if (!this.unlocked) {
      return { played: false, reason: "locked" };
    }

    const assetId = this.resolveVariant(request.assetId);
    if (assetId === undefined || !this.registry.has(assetId)) {
      return { played: false, reason: "unknown_asset" };
    }

    const asset = this.registry.get(assetId);
    if (asset.planned === true) {
      return { played: false, assetId, reason: "planned" };
    }

    const group = this.getMutableGroupSettings(asset.mixGroup);
    if (group.muted) {
      return { played: false, assetId, reason: "group_muted" };
    }

    const now = this.clock.now();
    const lastPlayedAt = this.lastPlayedAt.get(assetId);
    if (lastPlayedAt !== undefined && now - lastPlayedAt < asset.cooldownMs) {
      return { played: false, assetId, reason: "cooldown" };
    }

    const priority = request.priority ?? "normal";
    if (!this.reserveInstanceSlot(asset, priority)) {
      return { played: false, assetId, reason: "max_instances" };
    }

    const audio = this.audioFactory(asset.path);
    audio.src = asset.path;
    audio.currentTime = 0;
    audio.loop = asset.loop === true;
    audio.volume = clamp01(asset.volume * group.volume * (request.volumeScale ?? 1));

    const instance: ActiveAudioInstance = {
      assetId,
      mixGroup: asset.mixGroup,
      priority,
      audio
    };
    audio.onended = () => this.removeInstance(instance);
    audio.onerror = () => this.removeInstance(instance);
    this.activeInstances.push(instance);
    this.lastPlayedAt.set(assetId, now);
    void audio.play().catch(() => this.removeInstance(instance));

    return { played: true, assetId };
  }

  public stopAsset(assetId: string): void {
    for (const instance of [...this.activeInstances]) {
      if (instance.assetId === assetId) {
        this.stopInstance(instance);
      }
    }
  }

  public stopGroup(mixGroup: string): void {
    for (const instance of [...this.activeInstances]) {
      if (instance.mixGroup === mixGroup) {
        this.stopInstance(instance);
      }
    }
  }

  public stopAll(): void {
    for (const instance of [...this.activeInstances]) {
      this.stopInstance(instance);
    }
  }

  public getStatus(): AudioBusStatus {
    const groups: Record<string, { readonly volume: number; readonly muted: boolean }> = {};
    for (const [mixGroup, settings] of this.groupSettings.entries()) {
      groups[mixGroup] = { volume: settings.volume, muted: settings.muted };
    }
    for (const asset of this.registry.all()) {
      groups[asset.mixGroup] ??= { volume: 1, muted: false };
    }
    return Object.freeze({
      enabled: this.enabled,
      unlocked: this.unlocked,
      activeInstances: this.activeInstances.length,
      groups: Object.freeze(groups)
    });
  }

  private resolveVariant(assetId: string | readonly string[]): string | undefined {
    if (typeof assetId === "string") {
      return assetId;
    }
    if (assetId.length === 0) {
      return undefined;
    }
    const key = assetId.join("|");
    const cursor = this.variantCursor.get(key) ?? 0;
    this.variantCursor.set(key, cursor + 1);
    return assetId[cursor % assetId.length];
  }

  private reserveInstanceSlot(asset: CombatAudioAssetEntry, priority: AudioBusPriority): boolean {
    const sameAssetInstances = this.activeInstances.filter((instance) => instance.assetId === asset.id);
    if (sameAssetInstances.length >= asset.maxInstances) {
      const preempted = this.findLowestPriorityInstance(sameAssetInstances);
      if (preempted === undefined || PRIORITY_WEIGHT[priority] <= PRIORITY_WEIGHT[preempted.priority]) {
        return false;
      }
      this.stopInstance(preempted);
    }

    if (this.activeInstances.length >= this.maxActiveInstances) {
      const preempted = this.findLowestPriorityInstance(this.activeInstances);
      if (preempted === undefined || PRIORITY_WEIGHT[priority] <= PRIORITY_WEIGHT[preempted.priority]) {
        return false;
      }
      this.stopInstance(preempted);
    }

    return true;
  }

  private findLowestPriorityInstance(instances: readonly ActiveAudioInstance[]): ActiveAudioInstance | undefined {
    return [...instances].sort((left, right) => PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority])[0];
  }

  private getMutableGroupSettings(mixGroup: string): { volume: number; muted: boolean } {
    const existing = this.groupSettings.get(mixGroup);
    if (existing !== undefined) {
      return existing;
    }
    const created = { volume: 1, muted: false };
    this.groupSettings.set(mixGroup, created);
    return created;
  }

  private applyGroupVolume(mixGroup: string): void {
    const settings = this.getMutableGroupSettings(mixGroup);
    for (const instance of this.activeInstances) {
      if (instance.mixGroup === mixGroup) {
        const asset = this.registry.get(instance.assetId);
        instance.audio.volume = clamp01(asset.volume * settings.volume);
      }
    }
  }

  private stopInstance(instance: ActiveAudioInstance): void {
    instance.audio.pause();
    instance.audio.currentTime = 0;
    this.removeInstance(instance);
  }

  private removeInstance(instance: ActiveAudioInstance): void {
    this.activeInstances = this.activeInstances.filter((candidate) => candidate !== instance);
  }
}

function createBrowserAudioElement(src: string): AudioBusAudioElement {
  if (typeof Audio === "undefined") {
    throw new Error("Browser Audio API is unavailable.");
  }
  return new Audio(src);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
