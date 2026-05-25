import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { configureUiAssetManifest, type UiAssetManifest } from "../../src/assets/UiAssetRegistry";
import { createAssetButton } from "../../src/app/components/AssetButton";
import { createAssetPanel } from "../../src/app/components/AssetPanel";
import { createAttributePanel } from "../../src/app/components/AttributePanel";
import { createCharacterPortraitFrame } from "../../src/app/components/CharacterPortraitFrame";
import { createCloseButton } from "../../src/app/components/CloseButton";
import { createDestinyCard } from "../../src/app/components/DestinyCard";
import { createSpiritualRootDisc } from "../../src/app/components/SpiritualRootDisc";

describe("character creation DOM components", () => {
  beforeEach(() => {
    installFakeDocument();
    configureUiAssetManifest(readManifest());
  });

  it("renders asset panels with PNG background and DOM text children", () => {
    const panel = createAssetPanel({
      assetId: "cc.mainPanel",
      className: "test-panel",
      children: ["命盘总览"]
    });

    document.body.appendChild(panel);

    expect(panel.classList.contains("cc-asset-panel")).toBe(true);
    expect(panel.classList.contains("test-panel")).toBe(true);
    expect(panel.style.backgroundColor).toBe("transparent");
    expect(panel.style.backgroundRepeat).toBe("no-repeat");
    expect(panel.style.backgroundImage).toContain("character_creation_main_panel.png");
    expect(textOf(panel)).toContain("命盘总览");
  });

  it("switches AssetButton classes and asset image across hover, pressed, and disabled states", () => {
    let clicks = 0;
    const button = createAssetButton({
      label: "重新推演",
      normalAssetId: "cc.reroll.normal",
      hoverAssetId: "cc.reroll.hover",
      pressedAssetId: "cc.reroll.hover",
      onClick: () => {
        clicks += 1;
      }
    });

    button.dispatchEvent(new Event("mouseenter"));
    expect(button.classList.contains("is-hover")).toBe(true);
    expect(button.style.backgroundImage).toContain("reroll_fate_button_hover.png");

    button.dispatchEvent(new Event("pointerdown"));
    expect(button.classList.contains("is-pressed")).toBe(true);

    button.dispatchEvent(new Event("pointerup"));
    button.click();
    expect(clicks).toBe(1);

    button.setDisabled(true);
    button.click();
    expect(clicks).toBe(1);
    expect(button.classList.contains("is-disabled")).toBe(true);
  });

  it("renders close button as an asset-backed clickable button", () => {
    let closed = false;
    const button = createCloseButton({
      onClick: () => {
        closed = true;
      }
    });

    button.click();

    expect(button.getAttribute("aria-label")).toBe("关闭");
    expect(button.style.backgroundImage).toContain("close_button_normal.png");
    expect(closed).toBe(true);
  });

  it("renders destiny cards from rarity assets with text, effects, and lock button", () => {
    let lockToggled = false;
    const card = createDestinyCard({
      trait: {
        traitId: "destiny_clear_glass_heart",
        name: "清净琉璃心",
        rarity: "epic",
        tags: ["清心", "悟性"],
        positiveEffects: ["顿悟质量提高"],
        negativeEffects: ["魔道收益降低"]
      },
      slotLabel: "主命格",
      locked: false,
      onToggleLock: () => {
        lockToggled = true;
      }
    });

    document.body.appendChild(card);
    const lockButton = findByClass(card, "cc-trait-lock-button");
    lockButton.click();

    expect(card.classList.contains("cc-destiny-card")).toBe(true);
    expect(card.classList.contains("rarity-epic")).toBe(true);
    expect(card.style.backgroundImage).toContain("destiny_card_epic.png");
    expect(textOf(card)).toContain("清净琉璃心");
    expect(textOf(card)).toContain("主命格");
    expect(textOf(card)).toContain("顿悟质量提高");
    expect(textOf(card)).toContain("魔道收益降低");
    expect(lockToggled).toBe(true);
  });

  it("renders attribute rows with core treasures and aptitude stats", () => {
    const panel = createAttributePanel({
      coreStats: { jing: 31, qi: 28, shen: 36 },
      aptitude: {
        rootBone: 70,
        comprehension: 64,
        inspiration: 55,
        fortune: 42,
        heart: 80,
        lifespan: 77
      }
    });

    expect(panel.style.backgroundImage).toContain("character_attribute_panel.png");
    expect(textOf(panel)).toContain("精");
    expect(textOf(panel)).toContain("31");
    expect(textOf(panel)).toContain("根骨");
    expect(textOf(panel)).toContain("70");
    expect(findAllByClass(panel, "cc-attribute-row")).toHaveLength(9);
  });

  it("renders spiritual root disc with element badges and text", () => {
    const disc = createSpiritualRootDisc({
      root: {
        rootId: "root_thunder",
        displayName: "雷灵根",
        elements: ["thunder", "metal"],
        rarity: "rare",
        tags: ["雷法", "清场"]
      }
    });

    expect(disc.style.backgroundImage).toContain("spiritual_root_disc.png");
    expect(textOf(disc)).toContain("雷灵根");
    expect(textOf(disc)).toContain("thunder");
    expect(textOf(disc)).toContain("雷法");
    expect(findAllByClass(disc, "cc-element-badge")).toHaveLength(2);
  });

  it("renders character portrait frame with an optional seated silhouette", () => {
    const frame = createCharacterPortraitFrame({ showSilhouette: true });

    expect(frame.style.backgroundImage).toContain("character_portrait_frame.png");
    expect(findByClass(frame, "cc-portrait-silhouette").classList.contains("is-seated")).toBe(true);
  });
});

function readManifest(): UiAssetManifest {
  return JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/character_creation_manifest.v0.1.json"), "utf8")) as UiAssetManifest;
}

function installFakeDocument(): void {
  const fakeDocument = new FakeDocument();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: fakeDocument
  });
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: FakeEvent
  });
}

function textOf(input: unknown): string {
  const element = input as ElementLike;
  return [element.textContent, ...element.children.map((child) => textOf(child))].join("");
}

function findByClass(input: unknown, className: string): ElementLike {
  const element = input as ElementLike;
  const found = findAllByClass(element, className)[0];
  if (found === undefined) {
    throw new Error(`Missing element with class ${className}`);
  }
  return found;
}

function findAllByClass(input: unknown, className: string): ElementLike[] {
  const element = input as ElementLike;
  const matches = element.classList.contains(className) ? [element] : [];
  for (const child of element.children) {
    matches.push(...findAllByClass(child, className));
  }
  return matches;
}

interface ListenerRecord {
  readonly type: string;
  readonly listener: (event: FakeEvent) => void;
}

class FakeEvent {
  public readonly type: string;

  public constructor(type: string) {
    this.type = type;
  }
}

interface ElementLike {
  readonly children: ElementLike[];
  readonly classList: FakeClassList;
  readonly style: Record<string, string>;
  textContent: string;
  append(...children: Array<ElementLike | string>): void;
  appendChild(child: ElementLike): ElementLike;
  click(): void;
  getAttribute(name: string): string | null;
}

class FakeDocument {
  public readonly body = new FakeElement("body");

  public createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  public createTextNode(text: string): FakeTextNode {
    return new FakeTextNode(text);
  }
}

class FakeElement implements ElementLike {
  public readonly children: ElementLike[] = [];
  public readonly classList = new FakeClassList();
  public readonly style: Record<string, string> = {};
  public readonly dataset: Record<string, string> = {};
  public readonly listeners: ListenerRecord[] = [];
  public readonly tagName: string;
  public textContent = "";
  public className = "";
  public disabled = false;
  public type = "";
  private readonly attributes = new Map<string, string>();

  public constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public append(...children: Array<ElementLike | string>): void {
    for (const child of children) {
      if (typeof child === "string") {
        this.appendChild(new FakeTextNode(child));
      } else {
        this.appendChild(child);
      }
    }
  }

  public appendChild(child: ElementLike): ElementLike {
    this.children.push(child);
    return child;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public addEventListener(type: string, listener: (event: FakeEvent) => void): void {
    this.listeners.push({ type, listener });
  }

  public dispatchEvent(event: FakeEvent): boolean {
    for (const record of this.listeners) {
      if (record.type === event.type) {
        record.listener(event);
      }
    }
    return true;
  }

  public click(): void {
    if (!this.disabled) {
      this.dispatchEvent(new FakeEvent("click"));
    }
  }
}

class FakeTextNode implements ElementLike {
  public readonly children: ElementLike[] = [];
  public readonly classList = new FakeClassList();
  public readonly style: Record<string, string> = {};

  public constructor(public textContent: string) {}

  public append(): void {}

  public appendChild(child: ElementLike): ElementLike {
    return child;
  }

  public click(): void {}

  public getAttribute(): string | null {
    return null;
  }
}

class FakeClassList {
  private readonly names = new Set<string>();

  public add(...classNames: string[]): void {
    for (const className of classNames) {
      if (className.length > 0) {
        this.names.add(className);
      }
    }
  }

  public remove(...classNames: string[]): void {
    for (const className of classNames) {
      this.names.delete(className);
    }
  }

  public contains(className: string): boolean {
    return this.names.has(className);
  }

  public toggle(className: string, force?: boolean): boolean {
    const next = force ?? !this.names.has(className);
    if (next) {
      this.names.add(className);
    } else {
      this.names.delete(className);
    }
    return next;
  }
}
