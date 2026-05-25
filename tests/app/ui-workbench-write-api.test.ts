import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createUiWorkbenchWriteHandler, validateUiWorkbenchWriteRequest } from "../../src/dev/uiWorkbenchWriteApi";

describe("UI workbench write API", () => {
  it("writes allowed JSON files under the editor directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "ui-workbench-api-"));
    try {
      const handler = createUiWorkbenchWriteHandler({ projectRoot: root });
      const result = await handler({
        base64: Buffer.from(JSON.stringify({ ok: true }), "utf8").toString("base64"),
        path: "public/assets/generated/ui/editor/ui_asset_overrides.v0.1.json"
      });

      expect(result.ok).toBe(true);
      expect(JSON.parse(readFileSync(join(root, "public/assets/generated/ui/editor/ui_asset_overrides.v0.1.json"), "utf8"))).toEqual({
        ok: true
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects traversal, absolute paths, wrong extensions, and oversized payloads", () => {
    expect(() =>
      validateUiWorkbenchWriteRequest({
        base64: "e30=",
        path: "../outside.json"
      })
    ).toThrow(/editor/);
    expect(() =>
      validateUiWorkbenchWriteRequest({
        base64: "e30=",
        path: "C:/Users/32521/outside.json"
      })
    ).toThrow(/relative/);
    expect(() =>
      validateUiWorkbenchWriteRequest({
        base64: "e30=",
        path: "public/assets/generated/ui/editor/not_allowed.txt"
      })
    ).toThrow(/extension/);
    expect(() =>
      validateUiWorkbenchWriteRequest({
        base64: Buffer.alloc(2_000_001).toString("base64"),
        path: "public/assets/generated/ui/editor/too_large.json"
      })
    ).toThrow(/too large/);
  });
});
