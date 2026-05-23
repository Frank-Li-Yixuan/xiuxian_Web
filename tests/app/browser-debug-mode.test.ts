import { describe, expect, it } from "vitest";

import { isBrowserDebugModeEnabled } from "../../src/app/BrowserDebugMode";

describe("browser debug mode", () => {
  it("only enables review shortcut controls when debug=1 is present", () => {
    expect(isBrowserDebugModeEnabled("")).toBe(false);
    expect(isBrowserDebugModeEnabled("?stage=stage_01_qingyun")).toBe(false);
    expect(isBrowserDebugModeEnabled("?debug=0")).toBe(false);
    expect(isBrowserDebugModeEnabled("?debug=1")).toBe(true);
    expect(isBrowserDebugModeEnabled("debug=1")).toBe(true);
  });
});
