import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("browser full-bleed layout", () => {
  it("uses a full-screen playfield instead of the old 360px dashboard shell", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    const shellRule = html.match(/\.xiuxian-shell\s*\{[^}]+}/s)?.[0] ?? "";

    expect(html).toContain(".xiuxian-shell");
    expect(html).toContain("position: fixed");
    expect(html).toContain("inset: 0");
    expect(html).toContain(".xiuxian-playfield");
    expect(html).toContain("position: absolute");
    expect(html).not.toContain("grid-template-columns: minmax(0, 1fr) 360px");
    expect(html).not.toContain("grid-template-rows: minmax(0, 1fr) auto");
    expect(shellRule).not.toContain("padding");
  });

  it("keeps default DOM HUD compact and hides review controls unless debug mode is enabled", () => {
    const app = readFileSync(join(process.cwd(), "src/app/BrowserGameApp.ts"), "utf8");

    expect(app).not.toContain('title.textContent = "构筑摘要"');
    expect(app).not.toContain('row("调试证据"');
    expect(app).toContain('debug.hidden = true');
    expect(app).toContain('hud.className = "xiuxian-hud xiuxian-hud-overlay"');
  });
});
