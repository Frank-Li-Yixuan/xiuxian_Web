import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevFateMatrixScreen } from "../../src/app/screens/DevFateMatrixScreen";
import { buildNinePalaceDistributionTelemetry } from "../../src/ninePalace/NinePalaceDistributionTelemetry";

describe("dev fate matrix screen", () => {
  it("routes /dev/fate-matrix through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/fate-matrix");
    expect(mainSource).toContain("DevFateMatrixScreen");
    expect(mainSource).not.toContain("MainMenuApp /> : window.location.pathname === \"/dev/fate-matrix\"");
  });

  it("renders nine-palace scoring, eligibility, and mutation debug without hidden leaks", () => {
    const report = buildNinePalaceDistributionTelemetry({
      sampleCount: 64,
      seedPrefix: "npf-c006-dev",
      debugSampleCount: 3
    });

    const markup = renderToStaticMarkup(createElement(DevFateMatrixScreen, { report }));

    expect(markup).toContain("dev-fate-matrix");
    expect(markup).toContain("Three Powers");
    expect(markup).toContain("Derived Scores");
    expect(markup).toContain("Destiny Eligibility Explanation");
    expect(markup).toContain("Mutation Reasons");
    expect(markup).toContain("Conflict / Synergy");
    expect(markup).toContain("Heaven-Jealous Talent talentScore");
    expect(markup).toContain("Waste-Root Reversal rootBone/heart");
    expect(markup).toContain("Cowardly Supreme heart/lifespan");
    expect(markup).not.toContain("trueName");
    expect(markup).not.toContain("hiddenInternal");
    expect(markup).not.toContain("generated PNG control");
  });
});
