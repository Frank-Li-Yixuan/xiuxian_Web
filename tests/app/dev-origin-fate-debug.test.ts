import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevOriginFateDebugScreen } from "../../src/app/screens/DevOriginFateDebugScreen";
import { buildOriginFateV02DistributionTelemetry } from "../../src/originFate/OriginFateV02DistributionTelemetry";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";

describe("dev origin fate debug screen", () => {
  it("routes /dev/origin-fate-debug through the React entrypoint without changing the main menu path", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/origin-fate-debug");
    expect(mainSource).toContain("DevOriginFateDebugScreen");
    expect(mainSource).not.toContain("MainMenuApp /> : window.location.pathname === \"/dev/origin-fate-debug\"");
  });

  it("renders distribution, public safety previews, and dev-only internal names", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const report = buildOriginFateV02DistributionTelemetry({
      sampleCount: 64,
      seedPrefix: "hfo2-c008-dev",
      debugSampleCount: 3
    });

    const markup = renderToStaticMarkup(createElement(DevOriginFateDebugScreen, { report }));

    expect(markup).toContain("dev-origin-fate-debug");
    expect(markup).toContain("Distribution Summary");
    expect(markup).toContain("Public Omen View Comparison");
    expect(markup).toContain("Monthly Log Safety Preview");
    expect(markup).toContain("Major Choice Safety Preview");
    expect(markup).toContain("Age-18 Conversion Preview");
    expect(markup).toContain("Dev-only Internal Names");
    expect(registry.hiddenFates.some((hiddenFate) => markup.includes(hiddenFate.trueName))).toBe(true);
    expect(markup).not.toContain("generated PNG control");

    const publicSections = extractPublicSafetySections(markup);
    for (const hiddenFate of registry.hiddenFates) {
      expect(publicSections).not.toContain(hiddenFate.trueName);
    }
  });
});

function extractPublicSafetySections(markup: string): string {
  const start = markup.indexOf("Public Omen View Comparison");
  const end = markup.indexOf("Dev-only Internal Names");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return markup.slice(start, end);
}
