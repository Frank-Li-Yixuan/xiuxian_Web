import { beforeAll, describe, expect, it } from "vitest";

interface CharacterCreationScreenshotModule {
  CHARACTER_CREATION_SCREENSHOT_SCENARIOS: readonly CharacterCreationScenario[];
  createMarkdownReport: (report: CharacterCreationReport) => string;
  createReport: (options: {
    readonly generatedAt: string;
    readonly sourceUrl: string;
    readonly outputDir: string;
    readonly screenshots: readonly CharacterCreationScreenshot[];
    readonly checks: readonly CharacterCreationLayoutCheck[];
  }) => CharacterCreationReport;
  formatArtifactDate: (date: Date) => string;
  resolveOutputDir: (options: { readonly rootDir: string; readonly date: string }) => string;
}

interface CharacterCreationScenario {
  readonly id: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly reducedMotion: boolean;
  readonly actions: readonly string[];
}

interface CharacterCreationScreenshot {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly reducedMotion: boolean;
  readonly path: string;
}

interface CharacterCreationLayoutCheck {
  readonly id: string;
  readonly horizontalOverflow: boolean;
  readonly overlapCount: number;
  readonly visibleKeyElements: boolean;
  readonly issues: readonly string[];
}

interface CharacterCreationReport {
  readonly pass: boolean;
  readonly screenshots: readonly CharacterCreationScreenshot[];
  readonly checks: readonly CharacterCreationLayoutCheck[];
  readonly issues: readonly string[];
  readonly gate: string;
  readonly generatedAt: string;
  readonly sourceUrl: string;
  readonly outputDir: string;
}

let qualityGate: CharacterCreationScreenshotModule;

beforeAll(async () => {
  // @ts-ignore Runtime JS script has no TypeScript declaration file.
  qualityGate = (await import("../../scripts/quality-character-creation-screenshots.mjs")) as CharacterCreationScreenshotModule;
});

describe("CCUI2-C006 character creation screenshot gate helpers", () => {
  it("formats artifact dates and output directories predictably", () => {
    expect(qualityGate.formatArtifactDate(new Date("2026-06-03T08:00:00.000Z"))).toBe("2026-06-03");
    expect(qualityGate.resolveOutputDir({ rootDir: "D:/Game_1", date: "2026-06-03" }).replaceAll("\\", "/")).toBe(
      "D:/Game_1/artifacts/ccui2-c006-screenshots-2026-06-03"
    );
  });

  it("defines the required desktop, compact, and reduced-motion screenshot scenarios", () => {
    expect(qualityGate.CHARACTER_CREATION_SCREENSHOT_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "01_idle_default",
      "02_after_reroll",
      "03_locked_main_destiny",
      "04_confirm_life_dialog",
      "05_compact_1366x768",
      "06_compact_reduced_motion"
    ]);
    expect(qualityGate.CHARACTER_CREATION_SCREENSHOT_SCENARIOS.some((scenario) => scenario.viewport.width === 1366 && scenario.viewport.height === 768)).toBe(true);
    expect(qualityGate.CHARACTER_CREATION_SCREENSHOT_SCENARIOS.some((scenario) => scenario.reducedMotion)).toBe(true);
  });

  it("creates a pass/fail report and markdown summary", () => {
    const screenshots = qualityGate.CHARACTER_CREATION_SCREENSHOT_SCENARIOS.map((scenario) => ({
      id: scenario.id,
      title: scenario.id,
      description: "scenario",
      viewport: scenario.viewport,
      reducedMotion: scenario.reducedMotion,
      path: `artifacts/ccui2-c006-screenshots-2026-06-03/${scenario.id}.png`
    }));
    const report = qualityGate.createReport({
      generatedAt: "2026-06-03T08:00:00.000Z",
      sourceUrl: "http://127.0.0.1:5173/",
      outputDir: "artifacts/ccui2-c006-screenshots-2026-06-03",
      screenshots,
      checks: screenshots.map((screenshot) => ({
        id: screenshot.id,
        horizontalOverflow: false,
        overlapCount: 0,
        visibleKeyElements: true,
        issues: []
      }))
    });
    const markdown = qualityGate.createMarkdownReport(report);

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("CCUI2-C006");
    expect(report.screenshots).toHaveLength(6);
    expect(markdown).toContain("CCUI2-C006 Character Creation Screenshot Gate");
    expect(markdown).toContain("1366x768");
    expect(markdown).toContain("Reduced Motion");

    const failed = qualityGate.createReport({
      ...report,
      checks: [{ id: "bad", horizontalOverflow: true, overlapCount: 1, visibleKeyElements: false, issues: ["Horizontal overflow"] }]
    });
    expect(failed.pass).toBe(false);
    expect(failed.issues).toEqual(["bad: Horizontal overflow"]);
  });
});
