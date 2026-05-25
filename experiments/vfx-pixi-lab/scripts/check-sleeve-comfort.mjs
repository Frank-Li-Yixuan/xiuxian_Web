import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const sleeveCase = source.match(/case "sleeve_universe_absorb":[\s\S]*?case "tribulation_warning":/);

if (!sleeveCase) {
  throw new Error("Missing sleeve_universe_absorb filter case.");
}

const block = sleeveCase[0];
const forbiddenContinuousFilters = ["radialBlur", "rgbSplit"];
const found = forbiddenContinuousFilters.filter((name) => block.includes(name));

if (found.length > 0) {
  throw new Error(`Sleeve Universe comfort guard failed: continuous ${found.join(", ")} causes nausea.`);
}

if (!block.includes("zoomBlur") || !block.includes("glowCyan")) {
  throw new Error("Sleeve Universe should keep only a mild local compression/glow filter chain.");
}

console.log("Sleeve Universe comfort guard passed.");
