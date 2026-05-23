import type { ParticleBudgetsData, VfxQuality } from "./VfxRegistry";

export type ParticleBucket = "normal" | "spell" | "background" | "pickup_trail";

export interface VisualRng {
  next01(): number;
}

export interface ParticleSpawnRequest {
  readonly frame: number;
  readonly bucket: ParticleBucket;
  readonly effectId: string;
  readonly origin: {
    readonly x: number;
    readonly y: number;
  };
  readonly requestedCount: number;
  readonly lifeFrames: number;
  readonly visualRng: VisualRng;
}

export interface RenderParticle {
  readonly id: number;
  readonly effectId: string;
  readonly bucket: ParticleBucket;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spawnFrame: number;
  readonly expiresFrame: number;
  readonly mergedCount?: number;
}

export interface ParticleSpawnResult {
  readonly requested: number;
  readonly spawned: number;
  readonly dropped: number;
  readonly merged: boolean;
}

export interface ParticlePoolStats {
  readonly quality: string;
  readonly capacity: number;
  readonly active: number;
  readonly mergedBursts: number;
  readonly droppedParticles: number;
}

export interface ParticlePoolOptions {
  readonly budgets: ParticleBudgetsData;
  readonly quality?: VfxQuality;
}

export class ParticlePool {
  private readonly budgets: ParticleBudgetsData;
  private readonly quality: string;
  private readonly capacity: number;
  private readonly activeParticles: RenderParticle[] = [];
  private nextParticleId = 1;
  private mergedBursts = 0;
  private droppedParticles = 0;

  public constructor(options: ParticlePoolOptions) {
    this.budgets = options.budgets;
    this.quality = options.quality ?? options.budgets.defaultQuality;
    this.capacity = budgetCapacity(requireBudget(this.budgets, this.quality), "normal");
  }

  public spawnBurst(request: ParticleSpawnRequest): ParticleSpawnResult {
    validateSpawnRequest(request);
    this.update(request.frame);

    const bucketCapacity = budgetCapacity(requireBudget(this.budgets, this.quality), request.bucket);
    const currentInBucket = this.activeParticles.filter((particle) => particle.bucket === request.bucket).length;
    const available = Math.max(0, bucketCapacity - currentInBucket);
    const spawned = Math.min(request.requestedCount, available);
    const dropped = request.requestedCount - spawned;
    const merged = dropped > 0 && spawned > 0;
    const normalParticleCount = merged ? spawned - 1 : spawned;

    for (let index = 0; index < normalParticleCount; index += 1) {
      this.activeParticles.push(createParticle(request, this.nextParticleId, request.visualRng));
      this.nextParticleId += 1;
    }

    if (merged) {
      this.activeParticles.push(createParticle(request, this.nextParticleId, request.visualRng, dropped + 1));
      this.nextParticleId += 1;
      this.mergedBursts += 1;
    }

    this.droppedParticles += dropped;

    return Object.freeze({
      requested: request.requestedCount,
      spawned,
      dropped,
      merged
    });
  }

  public update(frame: number): void {
    const active = this.activeParticles.filter((particle) => particle.expiresFrame > frame);
    this.activeParticles.length = 0;
    this.activeParticles.push(...active);
  }

  public getActiveParticles(): readonly RenderParticle[] {
    return Object.freeze([...this.activeParticles]);
  }

  public getStats(): ParticlePoolStats {
    return Object.freeze({
      quality: this.quality,
      capacity: this.capacity,
      active: this.activeParticles.length,
      mergedBursts: this.mergedBursts,
      droppedParticles: this.droppedParticles
    });
  }
}

function createParticle(request: ParticleSpawnRequest, id: number, visualRng: VisualRng, mergedCount?: number): RenderParticle {
  const angle = visualRng.next01() * Math.PI * 2;
  const speed = 0.5 + visualRng.next01() * 2.5;
  const radius = visualRng.next01() * 10;
  const particle: RenderParticle = {
    id,
    effectId: request.effectId,
    bucket: request.bucket,
    x: round3(request.origin.x + Math.cos(angle) * radius),
    y: round3(request.origin.y + Math.sin(angle) * radius),
    vx: round3(Math.cos(angle) * speed),
    vy: round3(Math.sin(angle) * speed),
    spawnFrame: request.frame,
    expiresFrame: request.frame + request.lifeFrames,
    ...(mergedCount !== undefined ? { mergedCount } : {})
  };

  return Object.freeze(particle);
}

function validateSpawnRequest(request: ParticleSpawnRequest): void {
  if (!Number.isInteger(request.frame) || request.frame < 0) {
    throw new Error("particle spawn frame must be a non-negative integer");
  }
  if (!Number.isInteger(request.requestedCount) || request.requestedCount < 0) {
    throw new Error("particle requestedCount must be a non-negative integer");
  }
  if (!Number.isInteger(request.lifeFrames) || request.lifeFrames <= 0) {
    throw new Error("particle lifeFrames must be a positive integer");
  }
  if (!Number.isFinite(request.origin.x) || !Number.isFinite(request.origin.y)) {
    throw new Error("particle origin must be finite");
  }
}

function requireBudget(budgets: ParticleBudgetsData, quality: string) {
  const budget = budgets.qualityProfiles[quality];
  if (budget === undefined) {
    throw new Error(`Unknown particle quality: ${quality}`);
  }
  return budget;
}

function budgetCapacity(budget: ReturnType<typeof requireBudget>, bucket: ParticleBucket): number {
  switch (bucket) {
    case "spell":
      return budget.spellParticles;
    case "background":
      return budget.backgroundParticles;
    case "pickup_trail":
      return budget.pickupTrails;
    case "normal":
      return budget.normalParticles;
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
