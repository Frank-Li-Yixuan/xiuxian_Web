import {
  InputButtonBit,
  deriveButtonTransitions,
  type FrameInput,
  type InputButtonMask,
  type MoveAxis,
  type PlayerId
} from "../sim/input/FrameInput";

export interface PlayerKeyBindings {
  readonly up: readonly string[];
  readonly down: readonly string[];
  readonly left: readonly string[];
  readonly right: readonly string[];
  readonly focus: readonly string[];
  readonly spells: readonly [readonly string[], readonly string[], readonly string[], readonly string[]];
  readonly pills: readonly [readonly string[], readonly string[], readonly string[]];
  readonly interact: readonly string[];
  readonly confirm: readonly string[];
  readonly cancel: readonly string[];
}

const DEFAULT_BINDINGS: Readonly<Record<string, PlayerKeyBindings>> = {
  p1: {
    up: ["KeyW"],
    down: ["KeyS"],
    left: ["KeyA"],
    right: ["KeyD"],
    focus: ["ShiftLeft", "Space"],
    spells: [["KeyJ"], ["KeyK"], ["KeyL"], ["KeyI"]],
    pills: [["Digit1"], ["Digit2"], ["Digit3"]],
    interact: ["KeyH"],
    confirm: ["Enter"],
    cancel: ["Escape"]
  },
  p2: {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    focus: ["ShiftRight", "NumpadDecimal"],
    spells: [["Numpad1"], ["Numpad2"], ["Numpad5"], ["Numpad6"]],
    pills: [["Numpad7"], ["Numpad8"], ["Numpad9"]],
    interact: ["Numpad0"],
    confirm: ["NumpadEnter"],
    cancel: ["Backspace"]
  }
};

export class LocalKeyboardInputSource {
  private readonly playerIds: readonly PlayerId[];
  private readonly bindings: Readonly<Record<string, PlayerKeyBindings>>;
  private readonly downKeys = new Set<string>();
  private readonly previousDownMaskByPlayer = new Map<PlayerId, InputButtonMask>();
  private inputSeq = 1;

  public constructor(playerIds: readonly PlayerId[], bindings: Readonly<Record<string, PlayerKeyBindings>> = DEFAULT_BINDINGS) {
    if (playerIds.length === 0) {
      throw new Error("LocalKeyboardInputSource requires at least one player");
    }
    for (const playerId of playerIds) {
      if (playerId.length === 0) {
        throw new Error("playerId must not be empty");
      }
      if (bindings[playerId] === undefined) {
        throw new Error(`Missing key bindings for ${playerId}`);
      }
      this.previousDownMaskByPlayer.set(playerId, 0);
    }

    this.playerIds = [...playerIds];
    this.bindings = bindings;
  }

  public setKeyDown(code: string, down: boolean): void {
    if (code.length === 0) {
      return;
    }
    if (down) {
      this.downKeys.add(code);
    } else {
      this.downKeys.delete(code);
    }
  }

  public createFrameInputs(frame: number): readonly FrameInput[] {
    return this.playerIds.map((playerId) => {
      const binding = this.requireBinding(playerId);
      const downMask = this.createDownMask(binding);
      const previousDownMask = this.previousDownMaskByPlayer.get(playerId) ?? 0;
      const transitions = deriveButtonTransitions(previousDownMask, downMask);
      this.previousDownMaskByPlayer.set(playerId, downMask);

      const input: FrameInput = {
        frame,
        playerId,
        moveX: axis(this.anyDown(binding.left), this.anyDown(binding.right)),
        moveY: axis(this.anyDown(binding.up), this.anyDown(binding.down)),
        downMask,
        pressedMask: transitions.pressedMask,
        releasedMask: transitions.releasedMask,
        inputSeq: this.inputSeq
      };
      this.inputSeq += 1;
      return input;
    });
  }

  private requireBinding(playerId: PlayerId): PlayerKeyBindings {
    const binding = this.bindings[playerId];
    if (binding === undefined) {
      throw new Error(`Missing key bindings for ${playerId}`);
    }
    return binding;
  }

  private createDownMask(binding: PlayerKeyBindings): InputButtonMask {
    let mask = 0;
    const spellBits = [InputButtonBit.Spell1, InputButtonBit.Spell2, InputButtonBit.Spell3, InputButtonBit.Spell4] as const;
    const pillBits = [InputButtonBit.Pill1, InputButtonBit.Pill2, InputButtonBit.Pill3] as const;

    for (let index = 0; index < binding.spells.length; index += 1) {
      if (this.anyDown(binding.spells[index] ?? [])) {
        mask |= spellBits[index] ?? 0;
      }
    }
    for (let index = 0; index < binding.pills.length; index += 1) {
      if (this.anyDown(binding.pills[index] ?? [])) {
        mask |= pillBits[index] ?? 0;
      }
    }
    if (this.anyDown(binding.interact)) {
      mask |= InputButtonBit.Interact;
    }
    if (this.anyDown(binding.focus)) {
      mask |= InputButtonBit.Focus;
    }
    if (this.anyDown(binding.confirm)) {
      mask |= InputButtonBit.Confirm;
    }
    if (this.anyDown(binding.cancel)) {
      mask |= InputButtonBit.Cancel;
    }
    return mask >>> 0;
  }

  private anyDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.downKeys.has(code));
  }
}

function axis(negative: boolean, positive: boolean): MoveAxis {
  if (negative === positive) {
    return 0;
  }
  return positive ? 1 : -1;
}
