import { assertNonNegativeInteger, secondsToFrames } from "../SimConstants";
import { InputButtonBit, hasInputButton, type FrameInput, type PlayerId, validateFrameInput } from "../input/FrameInput";
import type { CombatPlayerState } from "../player/PlayerSystem";

export interface PillDefinitionPack {
  readonly items: readonly PillDefinition[];
}

export interface PillDefinition {
  readonly id: string;
  readonly digestTime: number;
  readonly effects: readonly PillEffectDefinition[];
  readonly afterEffects?: readonly PillEffectDefinition[];
}

export interface PillEffectDefinition {
  readonly effectId: string;
  readonly type: PillEffectType;
  readonly params: Readonly<Record<string, unknown>>;
}

export type PillEffectType = "heal_over_time" | "buff" | "cleanse" | "cultivation_gain";

export interface ActivePillDigestion {
  readonly pillId: string;
  readonly startFrame: number;
  readonly totalFrames: number;
  readonly remainingFrames: number;
}

export interface ActivePillAfterEffect {
  readonly pillId: string;
  readonly effectId: string;
  readonly type: PillEffectType;
  readonly params: Readonly<Record<string, unknown>>;
  readonly startFrame: number;
  readonly totalFrames: number;
  readonly remainingFrames: number;
}

export interface PillRuntimePlayerState {
  readonly playerId: PlayerId;
  readonly pillSlots: readonly (string | null)[];
  readonly inventory: Readonly<Record<string, number>>;
  readonly activeDigestions: readonly ActivePillDigestion[];
  readonly activeAfterEffects: readonly ActivePillAfterEffect[];
}

export interface CreatePillRuntimeInput {
  readonly playerId: PlayerId;
  readonly pillSlots: readonly (string | null)[];
  readonly inventory?: Readonly<Record<string, number>>;
  readonly activeDigestions?: readonly ActivePillDigestion[];
  readonly activeAfterEffects?: readonly ActivePillAfterEffect[];
}

export type PillDefinitionsById = Readonly<Record<string, PillDefinition>>;

export type PillEventName = "pill_swallowed" | "pill_swallow_failed" | "pill_digest_completed" | "pill_after_effect_started";

export type PillSwallowFailureReason =
  | "empty_slot"
  | "missing_inventory"
  | "same_pill_digesting"
  | "digestion_slots_full";

export interface PillEffectEvent {
  readonly frame: number;
  readonly playerId: PlayerId;
  readonly event: PillEventName;
  readonly pillId?: string;
  readonly effectId?: string;
  readonly reason?: PillSwallowFailureReason;
}

export interface PillCleanseEvent {
  readonly frame: number;
  readonly playerId: PlayerId;
  readonly pillId: string;
  readonly effectId: string;
  readonly removedTags: readonly string[];
}

export interface StepPillSystemOptions {
  readonly frame: number;
  readonly players: readonly CombatPlayerState[];
  readonly frameInputs: readonly FrameInput[];
  readonly pillDefinitions: PillDefinitionsById;
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly statusTagsByPlayer?: Readonly<Record<PlayerId, readonly string[]>>;
}

export interface StepPillSystemResult {
  readonly players: readonly CombatPlayerState[];
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly statusTagsByPlayer: Readonly<Record<PlayerId, readonly string[]>>;
  readonly effectEvents: readonly PillEffectEvent[];
  readonly cleanseEvents: readonly PillCleanseEvent[];
}

export interface PillModifiers {
  readonly attackSpeedMultiplier: number;
  readonly spellDamageMultiplier: number;
  readonly qiCostMultiplier: number;
  readonly moveSpeedMultiplier: number;
  readonly qiGainMultiplier: number;
  readonly statusTags: readonly string[];
}

export interface GetPillModifiersOptions {
  readonly pillDefinitions: PillDefinitionsById;
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly playerId: PlayerId;
}

const PILL_SLOT_BUTTONS = [InputButtonBit.Pill1, InputButtonBit.Pill2, InputButtonBit.Pill3] as const;
const MAX_CONCURRENT_DIGESTIONS = 2;

export function indexPillDefinitions(definitions: readonly PillDefinition[]): PillDefinitionsById {
  const indexed: Record<string, PillDefinition> = {};
  for (const definition of definitions) {
    validatePillDefinition(definition);
    if (indexed[definition.id] !== undefined) {
      throw new Error(`Duplicate pill definition id: ${definition.id}`);
    }
    indexed[definition.id] = definition;
  }
  return indexed;
}

export function createPillRuntimeState(inputs: readonly CreatePillRuntimeInput[]): readonly PillRuntimePlayerState[] {
  return inputs
    .map((input) => {
      assertPlayerId(input.playerId);
      validatePillSlots(input.pillSlots);
      const inventory = input.inventory === undefined ? inferInventoryFromSlots(input.pillSlots) : normalizeInventory(input.inventory);

      return {
        playerId: input.playerId,
        pillSlots: input.pillSlots,
        inventory,
        activeDigestions: input.activeDigestions ?? [],
        activeAfterEffects: input.activeAfterEffects ?? []
      };
    })
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}

export function stepPillSystem(options: StepPillSystemOptions): StepPillSystemResult {
  assertNonNegativeInteger(options.frame, "frame");

  const inputByPlayer = new Map<PlayerId, FrameInput>();
  for (const frameInput of options.frameInputs) {
    validateFrameInput(frameInput);
    inputByPlayer.set(frameInput.playerId, frameInput);
  }

  const playerById = new Map(options.players.map((player) => [player.playerId, player]));
  const statusTagsByPlayer = cloneStatusTags(options.statusTagsByPlayer ?? {});
  const effectEvents: PillEffectEvent[] = [];
  const cleanseEvents: PillCleanseEvent[] = [];
  const nextPillState: PillRuntimePlayerState[] = [];

  for (const runtime of [...options.pillState].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    const player = playerById.get(runtime.playerId);
    const frameInput = inputByPlayer.get(runtime.playerId);
    if (player === undefined || frameInput === undefined || !canSwallow(player)) {
      nextPillState.push(runtime);
      continue;
    }

    const slotIndex = getPressedPillSlotIndex(frameInput);
    if (slotIndex === undefined) {
      nextPillState.push(runtime);
      continue;
    }

    const pillId = runtime.pillSlots[slotIndex] ?? null;
    if (pillId === null) {
      effectEvents.push(createPillEvent({ frame: options.frame, playerId: runtime.playerId, event: "pill_swallow_failed", reason: "empty_slot" }));
      nextPillState.push(runtime);
      continue;
    }

    const definition = options.pillDefinitions[pillId];
    if (definition === undefined) {
      throw new Error(`Missing pill definition: ${pillId}`);
    }

    const failureReason = getSwallowFailureReason(runtime, pillId);
    if (failureReason !== undefined) {
      effectEvents.push(
        createPillEvent({
          frame: options.frame,
          playerId: runtime.playerId,
          event: "pill_swallow_failed",
          pillId,
          reason: failureReason
        })
      );
      nextPillState.push(runtime);
      continue;
    }

    const totalFrames = Math.max(1, secondsToFrames(definition.digestTime));
    const nextInventoryCount = (runtime.inventory[pillId] ?? 0) - 1;
    const nextRuntime: PillRuntimePlayerState = {
      ...runtime,
      inventory: {
        ...runtime.inventory,
        [pillId]: nextInventoryCount
      },
      activeDigestions: [
        ...runtime.activeDigestions,
        {
          pillId,
          startFrame: options.frame,
          totalFrames,
          remainingFrames: totalFrames
        }
      ].sort((a, b) => a.pillId.localeCompare(b.pillId) || a.startFrame - b.startFrame)
    };

    for (const effect of definition.effects) {
      if (effect.type === "cleanse") {
        const cleanseEvent = applyCleanseEffect({
          frame: options.frame,
          playerId: runtime.playerId,
          pillId,
          effect,
          statusTagsByPlayer
        });
        if (cleanseEvent.removedTags.length > 0) {
          cleanseEvents.push(cleanseEvent);
        }
      }
    }

    effectEvents.push(createPillEvent({ frame: options.frame, playerId: runtime.playerId, event: "pill_swallowed", pillId }));
    nextPillState.push(nextRuntime);
  }

  return {
    players: options.players,
    pillState: nextPillState.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    statusTagsByPlayer,
    effectEvents,
    cleanseEvents
  };
}

export function getPillModifiers(options: GetPillModifiersOptions): PillModifiers {
  const runtime = options.pillState.find((state) => state.playerId === options.playerId);
  const modifiers = createDefaultPillModifiers();
  if (runtime === undefined) {
    return modifiers;
  }

  for (const digestion of runtime.activeDigestions) {
    const definition = options.pillDefinitions[digestion.pillId];
    if (definition === undefined) {
      throw new Error(`Missing pill definition: ${digestion.pillId}`);
    }
    for (const effect of definition.effects) {
      applyModifierEffect(modifiers, effect);
    }
  }

  for (const afterEffect of runtime.activeAfterEffects) {
    applyModifierEffect(modifiers, afterEffect);
  }

  return modifiers;
}

function getPressedPillSlotIndex(frameInput: FrameInput): number | undefined {
  for (let index = 0; index < PILL_SLOT_BUTTONS.length; index += 1) {
    const button = PILL_SLOT_BUTTONS[index];
    if (button !== undefined && hasInputButton(frameInput.pressedMask, button)) {
      return index;
    }
  }
  return undefined;
}

function getSwallowFailureReason(runtime: PillRuntimePlayerState, pillId: string): PillSwallowFailureReason | undefined {
  const inventoryCount = runtime.inventory[pillId] ?? 0;
  if (inventoryCount <= 0) {
    return "missing_inventory";
  }
  if (runtime.activeDigestions.some((digestion) => digestion.pillId === pillId)) {
    return "same_pill_digesting";
  }
  if (runtime.activeDigestions.length >= MAX_CONCURRENT_DIGESTIONS) {
    return "digestion_slots_full";
  }
  return undefined;
}

function applyCleanseEffect(options: {
  readonly frame: number;
  readonly playerId: PlayerId;
  readonly pillId: string;
  readonly effect: PillEffectDefinition;
  readonly statusTagsByPlayer: Record<PlayerId, readonly string[]>;
}): PillCleanseEvent {
  const cleanseTags = stringArrayParam(options.effect.params, "cleanseTags");
  const currentTags = options.statusTagsByPlayer[options.playerId] ?? [];
  const removedTags = currentTags.filter((tag) => cleanseTags.includes(tag));
  options.statusTagsByPlayer[options.playerId] = currentTags.filter((tag) => !cleanseTags.includes(tag));

  return {
    frame: options.frame,
    playerId: options.playerId,
    pillId: options.pillId,
    effectId: options.effect.effectId,
    removedTags
  };
}

function applyModifierEffect(modifiers: MutablePillModifiers, effect: Pick<PillEffectDefinition, "type" | "params">): void {
  if (effect.type !== "buff" && effect.type !== "cleanse") {
    return;
  }

  modifiers.attackSpeedMultiplier *= optionalNumberParam(effect.params, "attackSpeedMultiplier", 1);
  modifiers.spellDamageMultiplier *= optionalNumberParam(effect.params, "spellDamageMultiplier", 1);
  modifiers.qiCostMultiplier *= optionalNumberParam(effect.params, "qiCostMultiplier", 1);
  modifiers.moveSpeedMultiplier *= optionalNumberParam(effect.params, "moveSpeedMultiplier", 1);
  modifiers.qiGainMultiplier *= optionalNumberParam(effect.params, "qiGainMultiplier", 1);

  const tag = optionalStringParam(effect.params, "tag");
  if (tag !== undefined) {
    modifiers.statusTags = [...modifiers.statusTags, tag].sort();
  }
}

interface MutablePillModifiers {
  attackSpeedMultiplier: number;
  spellDamageMultiplier: number;
  qiCostMultiplier: number;
  moveSpeedMultiplier: number;
  qiGainMultiplier: number;
  statusTags: readonly string[];
}

function createDefaultPillModifiers(): MutablePillModifiers {
  return {
    attackSpeedMultiplier: 1,
    spellDamageMultiplier: 1,
    qiCostMultiplier: 1,
    moveSpeedMultiplier: 1,
    qiGainMultiplier: 1,
    statusTags: []
  };
}

function createPillEvent(event: PillEffectEvent): PillEffectEvent {
  return event;
}

function canSwallow(player: CombatPlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function cloneStatusTags(statusTagsByPlayer: Readonly<Record<PlayerId, readonly string[]>>): Record<PlayerId, readonly string[]> {
  const cloned: Record<PlayerId, readonly string[]> = {};
  for (const [playerId, tags] of Object.entries(statusTagsByPlayer)) {
    cloned[playerId] = [...tags];
  }
  return cloned;
}

function inferInventoryFromSlots(pillSlots: readonly (string | null)[]): Readonly<Record<string, number>> {
  const inventory: Record<string, number> = {};
  for (const pillId of pillSlots) {
    if (pillId !== null) {
      inventory[pillId] = (inventory[pillId] ?? 0) + 1;
    }
  }
  return inventory;
}

function normalizeInventory(inventory: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  const normalized: Record<string, number> = {};
  for (const [pillId, count] of Object.entries(inventory)) {
    if (pillId.length === 0) {
      throw new Error("pill inventory id must not be empty");
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`pill inventory count for ${pillId} must be a non-negative integer`);
    }
    normalized[pillId] = count;
  }
  return normalized;
}

function validatePillDefinition(definition: PillDefinition): void {
  if (definition.id.length === 0) {
    throw new Error("pill id must not be empty");
  }
  if (!Number.isFinite(definition.digestTime) || definition.digestTime <= 0) {
    throw new Error(`pill ${definition.id} digestTime must be a positive finite number`);
  }
  for (const effect of definition.effects) {
    validatePillEffect(definition.id, effect);
  }
  for (const effect of definition.afterEffects ?? []) {
    validatePillEffect(definition.id, effect);
  }
}

function validatePillEffect(pillId: string, effect: PillEffectDefinition): void {
  if (effect.effectId.length === 0) {
    throw new Error(`pill ${pillId} effectId must not be empty`);
  }
  switch (effect.type) {
    case "heal_over_time":
    case "buff":
    case "cleanse":
    case "cultivation_gain":
      return;
    default:
      throw new Error(`pill ${pillId} has unsupported effect type: ${effect.type}`);
  }
}

function validatePillSlots(pillSlots: readonly (string | null)[]): void {
  if (pillSlots.length > 3) {
    throw new Error("pillSlots must contain at most 3 slots");
  }
  for (const pillId of pillSlots) {
    if (pillId !== null && pillId.length === 0) {
      throw new Error("pill slot id must not be empty");
    }
  }
}

function assertPlayerId(playerId: PlayerId): void {
  if (playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
}

function optionalNumberParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = params[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`pill param ${key} must be a finite number`);
  }
  return value;
}

function optionalStringParam(params: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = params[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`pill param ${key} must be a string`);
  }
  return value;
}

function stringArrayParam(params: Readonly<Record<string, unknown>>, key: string): readonly string[] {
  const value = params[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`pill param ${key} must be a string array`);
  }
  return value;
}
