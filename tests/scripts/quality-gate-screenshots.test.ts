import { beforeAll, describe, expect, it } from "vitest";

interface QualityGateModule {
  auditCombatAssetManifests: (rootDir: string) => {
    readonly pass: boolean;
    readonly visualAssetCount: number;
    readonly audioAssetCount: number;
    readonly attributionRequired: readonly string[];
    readonly requiredMissing: readonly string[];
    readonly licenseCounts: Readonly<Record<string, number>>;
  };
  createMarkdownReport: (report: QualityGateReport) => string;
  createReport: (options: {
    readonly generatedAt: string;
    readonly sourceUrl: string;
    readonly outputDir: string;
    readonly screenshots: readonly QualityGateScreenshot[];
    readonly performance: { readonly frameSamples: number; readonly fpsAverage: number; readonly fpsMin: number };
    readonly canvasMetrics: {
      readonly nonblankPixelsEstimate: number;
      readonly enemyBulletWhiteCoreSamples: number;
      readonly playerHitboxBrightPixels: number;
      readonly activeAudioElements: number;
      readonly audioManifestMaxInstances: number;
      readonly audioLoopAssets: number;
    };
    readonly license: QualityGateReport["license"];
  }) => QualityGateReport;
  formatArtifactDate: (date: Date) => string;
  resolveOutputDir: (options: { readonly rootDir: string; readonly date: string }) => string;
}

interface QualityGateScreenshot {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

interface QualityGateReport {
  readonly pass: boolean;
  readonly screenshots: readonly QualityGateScreenshot[];
  readonly license: {
    readonly pass: boolean;
    readonly visualAssetCount: number;
    readonly audioAssetCount: number;
    readonly attributionRequired: readonly string[];
    readonly requiredMissing: readonly string[];
    readonly licenseCounts: Readonly<Record<string, number>>;
    readonly issues: readonly string[];
  };
}

let qualityGate: QualityGateModule;

beforeAll(async () => {
  // @ts-ignore Runtime JS script has no TypeScript declaration file.
  qualityGate = (await import("../../scripts/quality-gate-screenshots.mjs")) as QualityGateModule;
});

describe("BAS-C012 quality gate screenshot script helpers", () => {
  it("formats artifact dates and output directories predictably", () => {
    expect(qualityGate.formatArtifactDate(new Date("2026-05-28T13:45:00.000Z"))).toBe("2026-05-28");
    expect(qualityGate.resolveOutputDir({ rootDir: "D:/Game_1", date: "2026-05-28" }).replaceAll("\\", "/")).toBe(
      "D:/Game_1/artifacts/combat-asset-pass/2026-05-28"
    );
  });

  it("audits current combat manifests for local CC0/Public Domain assets", () => {
    const audit = qualityGate.auditCombatAssetManifests(process.cwd());

    expect(audit.pass).toBe(true);
    expect(audit.visualAssetCount).toBe(17);
    expect(audit.audioAssetCount).toBe(12);
    expect(audit.attributionRequired).toEqual([]);
    expect(audit.requiredMissing).toEqual([]);
    expect(Object.keys(audit.licenseCounts).sort()).toEqual(["CC0", "Public Domain"]);
  });

  it("creates a report and markdown with FPS, VFX, audio, license, readability, and screenshot sections", () => {
    const license = qualityGate.auditCombatAssetManifests(process.cwd());
    const report = qualityGate.createReport({
      generatedAt: "2026-05-28T13:45:00.000Z",
      sourceUrl: "http://127.0.0.1:5173/dev/combat-asset-playground",
      outputDir: "artifacts/combat-asset-pass/2026-05-28",
      screenshots: [
        {
          id: "01_initial_combat",
          title: "Initial Combat",
          description: "Initial combat gate screenshot.",
          path: "artifacts/combat-asset-pass/2026-05-28/01_initial_combat.png"
        }
      ],
      performance: {
        frameSamples: 90,
        fpsAverage: 60,
        fpsMin: 58
      },
      canvasMetrics: {
        nonblankPixelsEstimate: 100000,
        enemyBulletWhiteCoreSamples: 100,
        playerHitboxBrightPixels: 28,
        activeAudioElements: 0,
        audioManifestMaxInstances: 38,
        audioLoopAssets: 1
      },
      license: {
        ...license,
        issues: []
      }
    });
    const markdown = qualityGate.createMarkdownReport(report);

    expect(report.pass).toBe(true);
    expect(markdown).toContain("Average FPS");
    expect(markdown).toContain("Same-screen VFX budget");
    expect(markdown).toContain("Audio voices");
    expect(markdown).toContain("License Audit");
    expect(markdown).toContain("Readability");
    expect(markdown).toContain("Screenshots");
  });
});
