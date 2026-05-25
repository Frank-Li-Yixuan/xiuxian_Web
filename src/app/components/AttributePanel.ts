import type { AptitudeStats, CoreThreeTreasures } from "../../types/character-creation-types.v0.1";
import { createAssetPanel, createTextElement } from "./AssetPanel";

export interface AttributePanelOptions {
  readonly coreStats: CoreThreeTreasures;
  readonly aptitude: AptitudeStats;
}

const ATTRIBUTE_ROWS: ReadonlyArray<{
  readonly key: keyof CoreThreeTreasures | keyof AptitudeStats;
  readonly label: string;
  readonly group: "core" | "aptitude";
}> = [
  { key: "jing", label: "精", group: "core" },
  { key: "qi", label: "气", group: "core" },
  { key: "shen", label: "神", group: "core" },
  { key: "rootBone", label: "根骨", group: "aptitude" },
  { key: "comprehension", label: "悟性", group: "aptitude" },
  { key: "inspiration", label: "灵感", group: "aptitude" },
  { key: "fortune", label: "气运", group: "aptitude" },
  { key: "heart", label: "心性", group: "aptitude" },
  { key: "lifespan", label: "寿元", group: "aptitude" }
];

export function createAttributePanel(options: AttributePanelOptions): HTMLDivElement {
  const panel = createAssetPanel({
    assetId: "cc.attributePanel",
    className: "cc-attribute-panel"
  });
  const rows = document.createElement("div");
  rows.classList.add("cc-attribute-rows");

  for (const row of ATTRIBUTE_ROWS) {
    const value = row.group === "core" ? options.coreStats[row.key as keyof CoreThreeTreasures] : options.aptitude[row.key as keyof AptitudeStats];
    rows.appendChild(createAttributeRow(row.label, value));
  }

  panel.appendChild(rows);
  return panel;
}

function createAttributeRow(label: string, value: number): HTMLDivElement {
  const row = createAssetPanel({
    assetId: "cc.attributeRow",
    className: "cc-attribute-row"
  });
  row.append(
    createTextElement("span", "cc-attribute-label", label),
    createTextElement("span", "cc-attribute-value", String(value))
  );
  return row;
}
