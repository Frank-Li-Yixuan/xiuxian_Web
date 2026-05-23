export type RngSeed = number | string;

export interface RngStreamState {
  readonly algorithm: "lcg32";
  readonly seed: number;
  readonly state: number;
  readonly streamName: string;
  readonly draws: number;
}

export interface WeightedChoice<T> {
  readonly item: T;
  readonly weight: number;
}

export const RUN_RNG_STREAM_NAMES = [
  "gameplay",
  "stage",
  "drop",
  "reward",
  "boss",
  "tribulation",
  "visual"
] as const;

export const GAMEPLAY_HASH_RNG_STREAM_NAMES = [
  "gameplay",
  "stage",
  "drop",
  "reward",
  "boss",
  "tribulation"
] as const;

export type RunRngStreamName = (typeof RUN_RNG_STREAM_NAMES)[number];
export type GameplayHashRngStreamName = (typeof GAMEPLAY_HASH_RNG_STREAM_NAMES)[number];
export type RunRngStreams = { readonly [K in RunRngStreamName]: SeededRng };

const UINT32_SIZE = 0x1_0000_0000;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export class SeededRng {
  private seed: number;
  private state: number;
  private streamName: string;
  private draws: number;

  public constructor(seed: RngSeed, streamName = "root") {
    const normalizedSeed = normalizeSeed(seed);
    this.seed = normalizedSeed;
    this.state = normalizedSeed;
    this.streamName = streamName;
    this.draws = 0;
  }

  public fork(streamName: string): SeededRng {
    if (streamName.length === 0) {
      throw new Error("RNG streamName must not be empty");
    }

    const childStreamName = this.streamName === "root" ? streamName : `${this.streamName}/${streamName}`;
    return new SeededRng(hashSeedParts(this.seed, childStreamName), childStreamName);
  }

  public nextUint32(): number {
    this.state = (Math.imul(LCG_MULTIPLIER, this.state) + LCG_INCREMENT) >>> 0;
    this.draws += 1;
    return this.state;
  }

  public nextFloat01(): number {
    return this.nextUint32() / UINT32_SIZE;
  }

  public rangeInt(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new Error("rangeInt bounds must be integers");
    }
    if (maxInclusive < minInclusive) {
      throw new Error("rangeInt maxInclusive must be >= minInclusive");
    }

    const span = maxInclusive - minInclusive + 1;
    return minInclusive + Math.floor(this.nextFloat01() * span);
  }

  public rangeFloat(minInclusive: number, maxExclusive: number): number {
    if (!Number.isFinite(minInclusive) || !Number.isFinite(maxExclusive)) {
      throw new Error("rangeFloat bounds must be finite");
    }
    if (maxExclusive < minInclusive) {
      throw new Error("rangeFloat maxExclusive must be >= minInclusive");
    }
    if (maxExclusive === minInclusive) {
      return minInclusive;
    }

    return minInclusive + this.nextFloat01() * (maxExclusive - minInclusive);
  }

  public bool(probability = 0.5): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error("bool probability must be between 0 and 1");
    }
    if (probability === 0) {
      return false;
    }
    if (probability === 1) {
      return true;
    }

    return this.nextFloat01() < probability;
  }

  public pickWeighted<T>(choices: readonly WeightedChoice<T>[]): T {
    if (choices.length === 0) {
      throw new Error("pickWeighted requires at least one choice");
    }

    let totalWeight = 0;
    for (const choice of choices) {
      if (!Number.isFinite(choice.weight) || choice.weight < 0) {
        throw new Error("pickWeighted weights must be finite and non-negative");
      }
      totalWeight += choice.weight;
    }

    if (totalWeight <= 0) {
      throw new Error("pickWeighted requires at least one positive weight");
    }

    const roll = this.rangeFloat(0, totalWeight);
    let cumulative = 0;
    let fallback: T | undefined;

    for (const choice of choices) {
      if (choice.weight > 0) {
        fallback = choice.item;
      }

      cumulative += choice.weight;
      if (roll < cumulative) {
        return choice.item;
      }
    }

    if (fallback === undefined) {
      throw new Error("pickWeighted requires at least one positive weight");
    }
    return fallback;
  }

  public getState(): RngStreamState {
    return {
      algorithm: "lcg32",
      seed: this.seed,
      state: this.state,
      streamName: this.streamName,
      draws: this.draws
    };
  }

  public setState(state: RngStreamState): void {
    if (state.algorithm !== "lcg32") {
      throw new Error(`Unsupported RNG algorithm: ${state.algorithm}`);
    }
    if (!Number.isInteger(state.seed) || !Number.isInteger(state.state) || !Number.isInteger(state.draws)) {
      throw new Error("RNG state must contain integer seed, state, and draws");
    }
    if (state.draws < 0) {
      throw new Error("RNG state draws must be non-negative");
    }
    if (state.streamName.length === 0) {
      throw new Error("RNG state streamName must not be empty");
    }

    this.seed = state.seed >>> 0;
    this.state = state.state >>> 0;
    this.streamName = state.streamName;
    this.draws = state.draws;
  }
}

export function createRunRngStreams(seed: RngSeed): RunRngStreams {
  const root = new SeededRng(seed);

  return {
    gameplay: root.fork("gameplay"),
    stage: root.fork("stage"),
    drop: root.fork("drop"),
    reward: root.fork("reward"),
    boss: root.fork("boss"),
    tribulation: root.fork("tribulation"),
    visual: root.fork("visual")
  };
}

function normalizeSeed(seed: RngSeed): number {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) {
      throw new Error("RNG numeric seed must be finite");
    }
    return Math.trunc(seed) >>> 0;
  }

  if (seed.length === 0) {
    throw new Error("RNG string seed must not be empty");
  }

  return fnv1a32(seed);
}

function hashSeedParts(seed: number, streamName: string): number {
  return fnv1a32(`${seed >>> 0}:${streamName}`);
}

function fnv1a32(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}
