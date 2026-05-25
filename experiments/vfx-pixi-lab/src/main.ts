import { Application, Container, Graphics, type Filter } from "pixi.js";
import { AdvancedBloomFilter } from "pixi-filters/advanced-bloom";
import { BulgePinchFilter } from "pixi-filters/bulge-pinch";
import { GlitchFilter } from "pixi-filters/glitch";
import { GlowFilter } from "pixi-filters/glow";
import { RadialBlurFilter } from "pixi-filters/radial-blur";
import { RGBSplitFilter } from "pixi-filters/rgb-split";
import { ShockwaveFilter } from "pixi-filters/shockwave";
import { ZoomBlurFilter } from "pixi-filters/zoom-blur";

import { IMPACT_FEEDBACKS, PRESETS, SCENARIOS } from "./scenarios";
import "./style.css";
import type { ImpactFeedback, ImpactFeedbackTypeId, PresetId, ScenarioId, Vec2, VfxPreset, VfxScenario } from "./types";

const WIDTH = 1600;
const HEIGHT = 900;
const SAFE_LEFT = 300;
const SAFE_RIGHT = 1300;
const DEG = Math.PI / 180;

interface LabMetrics {
  readonly fps: number;
  readonly frame: number;
  readonly sprites: number;
  readonly filters: number;
}

interface LabFilters {
  readonly bloom: AdvancedBloomFilter;
  readonly glowCyan: GlowFilter;
  readonly glowGold: GlowFilter;
  readonly shockwave: ShockwaveFilter;
  readonly rgbSplit: RGBSplitFilter;
  readonly radialBlur: RadialBlurFilter;
  readonly zoomBlur: ZoomBlurFilter;
  readonly bulgePinch: BulgePinchFilter;
  readonly glitch: GlitchFilter;
}

class PixiVfxLab {
  private readonly app = new Application();
  private readonly filteredWorld = new Container();
  private readonly background = new Graphics();
  private readonly enemies = new Graphics();
  private readonly spellLayer = new Graphics();
  private readonly distortionLayer = new Container();
  private readonly topFx = new Graphics();
  private readonly bullets = new Graphics();
  private readonly player = new Graphics();
  private readonly screenFlash = new Graphics();
  private readonly filters: LabFilters;
  private scenario = SCENARIOS[0] as VfxScenario;
  private preset = PRESETS[1] as VfxPreset;
  private feedback = IMPACT_FEEDBACKS[0] as ImpactFeedback;
  private paused = false;
  private frame = 0;
  private lastMetricTime = performance.now();
  private metricFrames = 0;

  public constructor(private readonly ui: ReturnType<typeof queryUi>) {
    this.filters = this.createFilters();
  }

  public async init(): Promise<void> {
    await this.app.init({
      width: WIDTH,
      height: HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      preference: "webgl",
      powerPreference: "high-performance"
    });

    this.ui.root.appendChild(this.app.canvas);
    this.distortionLayer.addChild(this.spellLayer, this.topFx);
    this.filteredWorld.addChild(this.background, this.enemies, this.distortionLayer);
    this.app.stage.addChild(this.filteredWorld, this.bullets, this.player, this.screenFlash);
    this.filteredWorld.filterArea = this.app.screen;
    this.distortionLayer.filterArea = this.app.screen;
    this.screenFlash.eventMode = "none";

    this.populateSelects();
    this.bindControls();
    this.applyScenario();
    this.app.ticker.add(() => this.tick());
  }

  private createFilters(): LabFilters {
    return {
      bloom: new AdvancedBloomFilter({ threshold: 0.22, bloomScale: 1.2, brightness: 1.08, blur: 6, quality: 5 }),
      glowCyan: new GlowFilter({ color: 0x67e8f9, distance: 24, outerStrength: 2.6, innerStrength: 0.5, quality: 0.35 }),
      glowGold: new GlowFilter({ color: 0xfde68a, distance: 26, outerStrength: 2.8, innerStrength: 0.4, quality: 0.35 }),
      shockwave: new ShockwaveFilter({ center: { x: 0.5, y: 0.5 }, speed: 760, amplitude: 18, wavelength: 150, brightness: 1.16, radius: 620 }),
      rgbSplit: new RGBSplitFilter({ red: { x: -8, y: 0 }, green: { x: 4, y: 2 }, blue: { x: 8, y: -2 } }),
      radialBlur: new RadialBlurFilter({ angle: 0, center: { x: WIDTH / 2, y: HEIGHT / 2 }, kernelSize: 9, radius: 360 }),
      zoomBlur: new ZoomBlurFilter({ center: { x: WIDTH / 2, y: HEIGHT / 2 }, strength: 0.08, innerRadius: 34, radius: 540 }),
      bulgePinch: new BulgePinchFilter({ center: { x: 0.5, y: 0.52 }, radius: 430, strength: 0.14 }),
      glitch: new GlitchFilter({ slices: 9, offset: 42, direction: 0, red: { x: -6, y: 0 }, green: { x: 0, y: 2 }, blue: { x: 6, y: 0 } })
    };
  }

  private populateSelects(): void {
    for (const scenario of SCENARIOS) {
      this.ui.scenarioSelect.appendChild(new Option(scenario.name, scenario.id));
    }
    for (const preset of PRESETS) {
      this.ui.presetSelect.appendChild(new Option(preset.name, preset.id));
    }
    for (const feedback of IMPACT_FEEDBACKS) {
      this.ui.feedbackSelect.appendChild(new Option(feedback.name, feedback.id));
    }
    this.ui.scenarioSelect.value = this.scenario.id;
    this.ui.presetSelect.value = this.preset.id;
    this.ui.feedbackSelect.value = this.feedback.id;
  }

  private bindControls(): void {
    this.ui.scenarioSelect.addEventListener("change", () => {
      this.scenario = requireScenario(this.ui.scenarioSelect.value as ScenarioId);
      this.applyScenario();
    });
    this.ui.presetSelect.addEventListener("change", () => {
      this.preset = requirePreset(this.ui.presetSelect.value as PresetId);
      this.applyScenario();
    });
    this.ui.feedbackSelect.addEventListener("change", () => {
      this.feedback = requireFeedback(this.ui.feedbackSelect.value as ImpactFeedbackTypeId);
      this.applyScenario();
    });
    this.ui.pauseButton.addEventListener("click", () => {
      this.paused = !this.paused;
      this.ui.pauseButton.textContent = this.paused ? "继续" : "暂停";
    });
    this.ui.stepButton.addEventListener("click", () => {
      if (!this.paused) {
        this.paused = true;
        this.ui.pauseButton.textContent = "继续";
      }
      this.frame = positiveModulo(this.frame + 1, this.scenario.durationFrames);
      this.render();
    });
  }

  private applyScenario(): void {
    this.frame = 0;
    const isImpactGallery = this.scenario.id === "impact_gallery";
    this.ui.feedbackControl.classList.toggle("is-hidden", !isImpactGallery);
    this.ui.sceneNote.textContent = isImpactGallery ? this.feedback.reviewNote : this.scenario.reviewNote;
    this.configureFilters();
    this.render();
  }

  private configureFilters(): void {
    const strength = this.preset.filterStrength;
    this.filteredWorld.filters = [];
    this.distortionLayer.filters = [];

    this.filters.bloom.bloomScale = 0.8 + strength * 0.55;
    this.filters.bloom.blur = 4 + strength * 4;
    this.filters.glowCyan.outerStrength = 1.8 + strength * 1.25;
    this.filters.glowGold.outerStrength = 1.8 + strength * 1.35;
    this.filters.shockwave.amplitude = 8 + strength * 16;
    this.filters.shockwave.wavelength = 135 - strength * 18;
    this.filters.rgbSplit.red = { x: -4 * strength, y: 0 };
    this.filters.rgbSplit.green = { x: 2 * strength, y: 2 * strength };
    this.filters.rgbSplit.blue = { x: 5 * strength, y: -2 * strength };
    this.filters.radialBlur.kernelSize = strength > 1.2 ? 13 : 9;
    this.filters.radialBlur.radius = 260 + strength * 130;
    this.filters.zoomBlur.strength = 0.045 + strength * 0.05;
    this.filters.bulgePinch.radius = 320 + strength * 140;
    this.filters.bulgePinch.strength = 0.07 + strength * 0.09;
    this.filters.glitch.slices = Math.round(5 + strength * 5);
    this.filters.glitch.offset = 18 + strength * 30;

    const scenarioFilters = this.filtersForScenario(this.scenario.id);
    this.distortionLayer.filters = [...scenarioFilters.distortion];
    this.filteredWorld.filters = [...scenarioFilters.world];
  }

  private filtersForScenario(id: ScenarioId): { readonly world: readonly Filter[]; readonly distortion: readonly Filter[] } {
    switch (id) {
      case "five_thunder_chain":
        return { world: [], distortion: [this.filters.glowCyan, this.filters.bloom, this.filters.shockwave] };
      case "red_lotus_field":
        return { world: [], distortion: [this.filters.bulgePinch, this.filters.glowGold, this.filters.bloom] };
      case "sleeve_universe_absorb":
        return { world: [], distortion: [this.filters.zoomBlur, this.filters.glowCyan, this.filters.bloom] };
      case "tribulation_warning":
        return { world: [this.filters.rgbSplit], distortion: [this.filters.shockwave, this.filters.glowGold, this.filters.bloom] };
      case "boss_death_cascade":
        return { world: [this.filters.glitch, this.filters.rgbSplit], distortion: [this.filters.shockwave, this.filters.glowGold, this.filters.bloom] };
      case "impact_gallery":
        return { world: [], distortion: [this.filters.glowCyan, this.filters.glowGold, this.filters.bloom, this.filters.shockwave] };
    }
  }

  private tick(): void {
    if (!this.paused) {
      this.frame = positiveModulo(this.frame + 1, this.scenario.durationFrames);
      this.render();
    }
    this.metricFrames += 1;
    const now = performance.now();
    if (now - this.lastMetricTime >= 500) {
      const fps = Math.round((this.metricFrames * 1000) / (now - this.lastMetricTime));
      this.metricFrames = 0;
      this.lastMetricTime = now;
      this.updateMetrics({
        fps,
        frame: this.frame,
        sprites:
          this.scenario.id === "impact_gallery"
            ? 44 + Math.round(36 * this.preset.particleScale)
            : this.scenario.enemyBullets + Math.round(80 * this.preset.particleScale),
        filters: countFilters(this.filteredWorld) + countFilters(this.distortionLayer)
      });
    }
  }

  private render(): void {
    const t = this.frame / this.scenario.durationFrames;
    this.background.clear();
    this.enemies.clear();
    this.spellLayer.clear();
    this.topFx.clear();
    this.bullets.clear();
    this.player.clear();
    this.screenFlash.clear();

    drawBackground(this.background, this.scenario.id, t);
    drawPracticeBounds(this.background);
    if (this.scenario.id !== "impact_gallery") {
      drawEnemies(this.enemies, this.scenario, this.frame);
    }

    switch (this.scenario.id) {
      case "five_thunder_chain":
        this.drawFiveThunder(t);
        break;
      case "red_lotus_field":
        this.drawRedLotus(t);
        break;
      case "sleeve_universe_absorb":
        this.drawSleeveUniverse(t);
        break;
      case "tribulation_warning":
        this.drawTribulation(t);
        break;
      case "boss_death_cascade":
        this.drawBossDeath(t);
        break;
      case "impact_gallery":
        this.drawImpactGallery(t);
        break;
    }

    if (this.scenario.id === "impact_gallery") {
      drawImpactReferenceBullets(this.bullets, this.frame, this.feedback);
    } else {
      drawEnemyBullets(this.bullets, this.scenario, this.frame, this.preset);
    }
    drawPlayer(this.player, this.scenario.playerPosition);
  }

  private drawFiveThunder(t: number): void {
    const points = [
      this.scenario.playerPosition,
      { x: 710, y: 500 },
      { x: 880, y: 420 },
      { x: 1008, y: 330 },
      { x: 640, y: 365 },
      { x: 945, y: 530 }
    ];
    const visibleLinks = Math.min(points.length - 1, Math.floor(t * 8) + 1);
    const shockCenter = points[Math.min(visibleLinks, points.length - 1)] ?? this.scenario.playerPosition;
    this.filters.shockwave.center = normalize(shockCenter);
    this.filters.shockwave.time = (t * 2.2) % 1.3;

    for (let index = 0; index < visibleLinks; index += 1) {
      const from = points[index];
      const to = points[index + 1];
      if (from !== undefined && to !== undefined) {
        drawLightning(this.spellLayer, from, to, this.frame + index * 17, 0x67e8f9, 5);
        drawLightning(this.spellLayer, from, to, this.frame + index * 23, 0xffffff, 1.6);
        drawBurst(this.topFx, to, 28 + pulse(this.frame, index) * 18, 0xfde68a, 0.38);
      }
    }
  }

  private drawRedLotus(t: number): void {
    const center = { x: 800, y: 500 };
    this.filters.bulgePinch.center = normalize(center);
    this.filters.bulgePinch.strength = (0.08 + this.preset.filterStrength * 0.1) * (0.75 + Math.sin(t * Math.PI * 2) * 0.25);

    for (let ring = 0; ring < 6; ring += 1) {
      const radius = 115 + ring * 43 + Math.sin(t * Math.PI * 2 + ring) * 9;
      this.spellLayer.circle(center.x, center.y, radius).stroke({
        width: ring % 2 === 0 ? 4 : 2,
        color: ring % 2 === 0 ? 0xf97316 : 0xfde68a,
        alpha: 0.2 + this.preset.filterStrength * 0.1
      });
    }
    const flames = Math.round(95 * this.preset.particleScale);
    for (let index = 0; index < flames; index += 1) {
      const angle = index * 2.399 + t * 3.8;
      const radius = 70 + ((index * 31 + this.frame * 2) % 260);
      const x = center.x + Math.cos(angle) * radius * 1.08;
      const y = center.y + Math.sin(angle) * radius * 0.68;
      const size = 2 + (index % 5);
      this.spellLayer.circle(x, y, size).fill({ color: index % 3 === 0 ? 0xfde68a : 0xf97316, alpha: 0.36 });
    }
  }

  private drawSleeveUniverse(t: number): void {
    const center = { x: 800, y: 500 };
    const compression = trianglePulse(t, 0.48, 0.68);
    this.filters.zoomBlur.center = center;
    this.filters.zoomBlur.strength = 0.004 + compression * 0.028 * this.preset.filterStrength;
    this.filters.zoomBlur.innerRadius = 58 + compression * 34;
    this.filters.zoomBlur.radius = 430;

    const corePulse = (Math.sin(t * Math.PI * 4) + 1) * 0.5;
    this.spellLayer.circle(center.x, center.y, 48 + corePulse * 5 + compression * 18).fill({ color: 0x0f172a, alpha: 0.88 });
    this.spellLayer.circle(center.x, center.y, 68 + compression * 20).stroke({ width: 4, color: 0x67e8f9, alpha: 0.7 });
    this.spellLayer.circle(center.x, center.y, 96 + compression * 50).stroke({ width: 2, color: 0xc4b5fd, alpha: 0.2 + compression * 0.28 });

    const streamCount = Math.round(34 * this.preset.particleScale);
    for (let index = 0; index < streamCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const phase = ((this.frame * 0.55 + index * 11) % 96) / 96;
      const from = {
        x: center.x + side * (285 + (lane % 5) * 44),
        y: 260 + ((lane * 53 + index * 17) % 405)
      };
      const mid = {
        x: lerp(from.x, center.x, 0.52) + side * 54,
        y: lerp(from.y, center.y, 0.42) - 34 + (lane % 3) * 24
      };
      const pull = 0.18 + phase * 0.62 + compression * 0.12;
      const head = quadraticPoint(from, mid, center, Math.min(0.94, pull));
      const color = index % 3 === 0 ? 0x67e8f9 : 0xc4b5fd;
      drawCurveApprox(this.spellLayer, from, mid, head, color, 0.18 + compression * 0.16);
      this.spellLayer.circle(head.x, head.y, 2.2 + (index % 4) * 0.7).fill({ color, alpha: 0.5 });
    }

    if (t > 0.62) {
      const out = (t - 0.62) / 0.38;
      for (let index = 0; index < 7; index += 1) {
        const angle = -Math.PI / 2 + (index - 3) * 0.12;
        const to = { x: center.x + Math.cos(angle) * (180 + out * 520), y: center.y + Math.sin(angle) * (160 + out * 420) };
        drawLightning(this.topFx, center, to, this.frame + index * 11, 0xfde68a, 3);
      }
    }
  }

  private drawTribulation(t: number): void {
    const targets = [
      { x: 745, y: 610 },
      { x: 920, y: 580 },
      { x: 665, y: 420 }
    ];
    const active = targets[Math.floor(t * targets.length) % targets.length] ?? { x: 745, y: 610 };
    this.filters.shockwave.center = normalize(active);
    this.filters.shockwave.time = (t * 2.6) % 1.1;

    this.screenFlash.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0x312e81, alpha: 0.08 + this.preset.flashAlpha * 0.5 });
    for (const [index, target] of targets.entries()) {
      const charge = (t * 3 + index * 0.23) % 1;
      this.topFx.circle(target.x, target.y, 72 + Math.sin(charge * Math.PI) * 9).stroke({
        width: 5,
        color: index === 0 ? 0xff1f3d : 0xf97316,
        alpha: 0.88
      });
      this.topFx.moveTo(target.x, 0).lineTo(target.x, target.y).stroke({ width: 2, color: 0xff1f3d, alpha: 0.36 });
      if (charge > 0.58) {
        drawLightning(this.topFx, { x: target.x + Math.sin(this.frame * 0.13) * 28, y: 0 }, target, this.frame + index * 5, 0xffffff, 7);
        drawLightning(this.topFx, { x: target.x - 12, y: 0 }, target, this.frame + index * 19, 0xa78bfa, 3);
      }
    }
  }

  private drawBossDeath(t: number): void {
    const center = { x: 800, y: 250 };
    this.filters.shockwave.center = normalize(center);
    this.filters.shockwave.time = t * 2.4;
    this.filters.glitch.seed = Math.sin(this.frame * 0.2) * 10;
    if (this.frame % 12 === 0) {
      this.filters.glitch.refresh();
    }

    this.enemies.circle(center.x, center.y, 115).fill({ color: 0x13091f, alpha: 0.96 });
    this.enemies.circle(center.x, center.y, 122).stroke({ width: 4, color: 0xa78bfa, alpha: 0.8 });
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + t * 1.8;
      const radius = 70 + Math.sin(t * Math.PI * 3 + index) * 22;
      const p = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
      this.topFx.circle(p.x, p.y, 12 + index % 4).fill({ color: index % 2 === 0 ? 0xfde68a : 0xc4b5fd, alpha: 0.72 });
    }
    for (let ring = 0; ring < 6; ring += 1) {
      const radius = 80 + ring * 58 + t * 230;
      this.topFx.circle(center.x, center.y, radius).stroke({ width: 4, color: ring % 2 === 0 ? 0xfde68a : 0x67e8f9, alpha: Math.max(0.08, 0.56 - ring * 0.07) });
    }
    const flash = Math.max(0, Math.sin(t * Math.PI * 5)) * this.preset.flashAlpha;
    this.screenFlash.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0xffffff, alpha: flash });
  }

  private drawImpactGallery(t: number): void {
    const target = { x: 800, y: 385 };
    const impactPoint = this.feedback.id === "graze_flash" ? { x: 824, y: 752 } : target;
    this.filters.shockwave.center = normalize(impactPoint);
    this.filters.shockwave.time = trianglePulse(t, 0.18, 0.58) * 0.42;
    this.filters.shockwave.amplitude = (this.feedback.id === "boss_bullet_impact" ? 24 : 10) * this.preset.filterStrength;

    if (this.feedback.family === "enemy_hit") {
      drawImpactTarget(this.enemies, target, this.frame, this.feedback.id);
      drawPlayerShotTrail(this.spellLayer, this.scenario.playerPosition, target, t);
    } else {
      drawShieldAnchor(this.enemies, target);
    }

    switch (this.feedback.id) {
      case "light_hit":
        this.drawLightHit(target, t);
        break;
      case "thunder_hit":
        this.drawThunderHit(target, t);
        break;
      case "fire_dot_hit":
        this.drawFireDotHit(target, t);
        break;
      case "armor_break_hit":
        this.drawArmorBreakHit(target, t);
        break;
      case "kill_pop":
        this.drawKillPop(target, t);
        break;
      case "enemy_bullet_blocked":
        this.drawEnemyBulletBlocked(target, t);
        break;
      case "enemy_bullet_clear":
        this.drawEnemyBulletClear(target, t);
        break;
      case "player_bullet_impact":
        this.drawPlayerBulletImpact(target, t);
        break;
      case "boss_bullet_impact":
        this.drawBossBulletImpact(target, t);
        break;
      case "graze_flash":
        this.drawGrazeFlash(this.scenario.playerPosition, t);
        break;
    }
  }

  private drawLightHit(target: Vec2, t: number): void {
    drawHitSparks(this.topFx, target, this.frame, 10, 0xfde68a, 0.62, -0.35);
    drawSlashMark(this.topFx, target, -34, 0xffffff, 0.9);
    drawBurst(this.topFx, target, 28 + pulse(this.frame, 1) * 10, 0xffffff, 0.28);
    this.screenFlash.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0xffffff, alpha: 0.018 + this.preset.flashAlpha * 0.04 * trianglePulse(t, 0.08, 0.24) });
  }

  private drawThunderHit(target: Vec2, t: number): void {
    for (let index = 0; index < 5; index += 1) {
      const angle = index * 1.25 + this.frame * 0.08;
      const end = { x: target.x + Math.cos(angle) * 82, y: target.y + Math.sin(angle) * 58 };
      drawLightning(this.topFx, target, end, this.frame + index * 19, 0x67e8f9, index === 0 ? 5 : 2.5);
    }
    drawBurst(this.topFx, target, 52 + trianglePulse(t, 0.1, 0.42) * 34, 0x67e8f9, 0.42);
    this.topFx.circle(target.x, target.y, 38).stroke({ width: 3, color: 0xffffff, alpha: 0.82 });
  }

  private drawFireDotHit(target: Vec2, t: number): void {
    const heat = 1 + Math.sin(t * Math.PI * 8) * 0.08;
    this.spellLayer.circle(target.x, target.y, 62 * heat).stroke({ width: 4, color: 0xf97316, alpha: 0.48 });
    drawHitSparks(this.topFx, target, this.frame, 26, 0xf97316, 0.48, -1.35);
    for (let index = 0; index < 14; index += 1) {
      const x = target.x + Math.sin(index * 1.7 + t * 4) * (28 + index % 5);
      const y = target.y + 30 - ((this.frame * 2 + index * 19) % 110);
      this.topFx.circle(x, y, 3 + (index % 3)).fill({ color: index % 2 === 0 ? 0xfde68a : 0xf97316, alpha: 0.42 });
    }
  }

  private drawArmorBreakHit(target: Vec2, t: number): void {
    drawBurst(this.topFx, target, 46 + trianglePulse(t, 0.1, 0.38) * 54, 0xfacc15, 0.5);
    for (let index = 0; index < 9; index += 1) {
      const angle = -Math.PI * 0.95 + index * 0.24;
      const from = { x: target.x + Math.cos(angle) * 18, y: target.y + Math.sin(angle) * 16 };
      const to = { x: target.x + Math.cos(angle) * (74 + index * 7), y: target.y + Math.sin(angle) * (54 + index * 5) };
      this.topFx.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 3, color: 0xfde68a, alpha: 0.72 });
      this.topFx.circle(to.x, to.y, 4).fill({ color: 0xfacc15, alpha: 0.62 });
    }
    drawCracks(this.topFx, target, 0xfde68a);
  }

  private drawKillPop(target: Vec2, t: number): void {
    const collapse = trianglePulse(t, 0.08, 0.5);
    this.topFx.circle(target.x, target.y, 40 - collapse * 16).fill({ color: 0xffffff, alpha: 0.16 + collapse * 0.28 });
    drawBurst(this.topFx, target, 58 + collapse * 70, 0xc4b5fd, 0.46);
    drawHitSparks(this.topFx, target, this.frame, 34, 0x67e8f9, 0.42, -0.85);
    this.topFx.circle(target.x, target.y - 40 - t * 80, 18).stroke({ width: 2, color: 0xfde68a, alpha: Math.max(0.12, 0.7 - t * 0.55) });
  }

  private drawEnemyBulletBlocked(target: Vec2, t: number): void {
    const shield = { x: target.x, y: target.y + 145 };
    drawIncomingBullet(this.bullets, { x: shield.x - 280 + t * 210, y: shield.y - 70 + t * 35 }, true);
    this.topFx.circle(shield.x, shield.y, 68 + trianglePulse(t, 0.08, 0.36) * 36).stroke({ width: 4, color: 0x67e8f9, alpha: 0.64 });
    this.topFx.circle(shield.x - 18, shield.y - 12, 18).fill({ color: 0xffffff, alpha: 0.16 });
    drawHitSparks(this.topFx, { x: shield.x - 18, y: shield.y - 12 }, this.frame, 18, 0xef4444, 0.55, -0.2);
  }

  private drawEnemyBulletClear(target: Vec2, t: number): void {
    const center = { x: target.x, y: target.y + 110 };
    this.topFx.circle(center.x, center.y, 44 + t * 160).stroke({ width: 4, color: 0x67e8f9, alpha: Math.max(0.14, 0.68 - t * 0.38) });
    for (let index = 0; index < 10; index += 1) {
      const angle = index * 0.63 + t * 1.2;
      const p = { x: center.x + Math.cos(angle) * (60 + index * 9), y: center.y + Math.sin(angle) * (36 + index * 7) };
      this.topFx.circle(p.x, p.y, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.52 });
    }
  }

  private drawPlayerBulletImpact(target: Vec2, t: number): void {
    drawPlayerShotTrail(this.spellLayer, this.scenario.playerPosition, target, t);
    drawSlashMark(this.topFx, target, -42, 0x67e8f9, 0.9);
    drawSlashMark(this.topFx, { x: target.x + 12, y: target.y + 8 }, -35, 0xffffff, 0.72);
    drawHitSparks(this.topFx, target, this.frame, 16, 0xfde68a, 0.58, -0.45);
  }

  private drawBossBulletImpact(target: Vec2, t: number): void {
    const center = { x: target.x, y: target.y + 120 };
    drawIncomingBullet(this.bullets, { x: center.x - 250 + t * 190, y: center.y - 40 + t * 10 }, true, 18);
    this.topFx.circle(center.x, center.y, 52 + trianglePulse(t, 0.1, 0.45) * 88).stroke({ width: 7, color: 0xf97316, alpha: 0.58 });
    this.topFx.circle(center.x, center.y, 28).fill({ color: 0xffffff, alpha: 0.12 });
    drawHitSparks(this.topFx, center, this.frame, 26, 0xf97316, 0.5, -0.1);
  }

  private drawGrazeFlash(playerPosition: Vec2, t: number): void {
    drawIncomingBullet(this.bullets, { x: playerPosition.x + 42, y: playerPosition.y - 95 + t * 70 }, false);
    const flash = { x: playerPosition.x + 22, y: playerPosition.y - 8 };
    this.topFx.moveTo(flash.x - 12, flash.y - 44).lineTo(flash.x + 20, flash.y + 18).stroke({ width: 3, color: 0xffffff, alpha: 0.92 });
    this.topFx.moveTo(flash.x - 3, flash.y - 36).lineTo(flash.x + 28, flash.y + 12).stroke({ width: 2, color: 0x67e8f9, alpha: 0.65 });
    this.topFx.circle(playerPosition.x, playerPosition.y, 38).stroke({ width: 1.5, color: 0xfde68a, alpha: 0.28 });
  }

  private updateMetrics(metrics: LabMetrics): void {
    this.ui.metricFps.textContent = String(metrics.fps);
    this.ui.metricFrame.textContent = String(metrics.frame);
    this.ui.metricSprites.textContent = String(metrics.sprites);
    this.ui.metricFilters.textContent = String(metrics.filters);
  }
}

function queryUi() {
  const root = requireElement("pixi-root");
  return {
    root,
    scenarioSelect: requireElement("scenario-select", HTMLSelectElement),
    presetSelect: requireElement("preset-select", HTMLSelectElement),
    feedbackControl: requireElement("feedback-control"),
    feedbackSelect: requireElement("feedback-select", HTMLSelectElement),
    pauseButton: requireElement("pause-button", HTMLButtonElement),
    stepButton: requireElement("step-button", HTMLButtonElement),
    metricFps: requireElement("metric-fps"),
    metricFrame: requireElement("metric-frame"),
    metricSprites: requireElement("metric-sprites"),
    metricFilters: requireElement("metric-filters"),
    sceneNote: requireElement("scene-note")
  };
}

function requireElement<T extends HTMLElement>(
  id: string,
  constructorType?: new (...args: never[]) => T
): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element: ${id}`);
  }
  if (constructorType !== undefined && !(element instanceof constructorType)) {
    throw new Error(`Element ${id} has the wrong type`);
  }
  return element as T;
}

function requireScenario(id: ScenarioId): VfxScenario {
  const scenario = SCENARIOS.find((candidate) => candidate.id === id);
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return scenario;
}

function requirePreset(id: PresetId): VfxPreset {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  if (preset === undefined) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

function requireFeedback(id: ImpactFeedbackTypeId): ImpactFeedback {
  const feedback = IMPACT_FEEDBACKS.find((candidate) => candidate.id === id);
  if (feedback === undefined) {
    throw new Error(`Unknown impact feedback: ${id}`);
  }
  return feedback;
}

function drawImpactReferenceBullets(graphics: Graphics, frame: number, feedback: ImpactFeedback): void {
  const quietField = feedback.id === "graze_flash" || feedback.id === "enemy_bullet_blocked" || feedback.id === "boss_bullet_impact";
  const count = quietField ? 8 : 13;
  for (let index = 0; index < count; index += 1) {
    const x = SAFE_LEFT + 108 + ((index * 157 + frame * 2) % (SAFE_RIGHT - SAFE_LEFT - 216));
    const y = 175 + ((index * 83 + frame * 3) % 500);
    const boss = index % 7 === 0;
    const radius = boss ? 12 : 7;
    graphics.circle(x, y, radius + 7).fill({ color: boss ? 0xf97316 : 0xef4444, alpha: quietField ? 0.12 : 0.16 });
    graphics.circle(x, y, radius).fill({ color: 0xffffff, alpha: 0.98 });
    graphics.circle(x, y, radius).stroke({ width: boss ? 4 : 3, color: boss ? 0xf97316 : 0xef4444, alpha: 0.98 });
  }
}

function drawImpactTarget(graphics: Graphics, position: Vec2, frame: number, feedbackId: ImpactFeedbackTypeId): void {
  const flash = feedbackId === "thunder_hit" || feedbackId === "kill_pop";
  const armor = feedbackId === "armor_break_hit";
  const burn = feedbackId === "fire_dot_hit";
  const outline = armor ? 0xfacc15 : burn ? 0xf97316 : flash ? 0x67e8f9 : 0xfb7185;
  const wobble = Math.sin(frame * 0.22) * (feedbackId === "kill_pop" ? 5 : 2);
  graphics.poly([
    position.x,
    position.y - 48 + wobble,
    position.x + 42,
    position.y + 5,
    position.x + 20,
    position.y + 48,
    position.x - 22,
    position.y + 48,
    position.x - 42,
    position.y + 5
  ]).fill({ color: 0x13091f, alpha: feedbackId === "kill_pop" ? 0.62 : 0.94 }).stroke({ width: 4, color: outline, alpha: 0.9 });
  graphics.circle(position.x, position.y + 2, 13).fill({ color: flash ? 0xffffff : outline, alpha: flash ? 0.84 : 0.7 });
  graphics.circle(position.x, position.y + 2, 28).stroke({ width: 2, color: outline, alpha: 0.28 });
}

function drawPlayerShotTrail(graphics: Graphics, from: Vec2, to: Vec2, t: number): void {
  const head = {
    x: lerp(from.x, to.x, Math.min(1, 0.45 + t * 0.9)),
    y: lerp(from.y - 30, to.y, Math.min(1, 0.45 + t * 0.9))
  };
  graphics.moveTo(from.x, from.y - 42).lineTo(head.x, head.y).stroke({ width: 3, color: 0x67e8f9, alpha: 0.42 });
  graphics.moveTo(from.x - 12, from.y - 18).lineTo(head.x - 16, head.y + 8).stroke({ width: 1.5, color: 0xffffff, alpha: 0.48 });
  graphics.circle(head.x, head.y, 8).fill({ color: 0xfde68a, alpha: 0.66 });
}

function drawShieldAnchor(graphics: Graphics, target: Vec2): void {
  const center = { x: target.x, y: target.y + 122 };
  graphics.circle(center.x, center.y, 86).stroke({ width: 3, color: 0x67e8f9, alpha: 0.28 });
  graphics.circle(center.x, center.y, 54).stroke({ width: 4, color: 0xfde68a, alpha: 0.34 });
  graphics.moveTo(center.x - 72, center.y).lineTo(center.x + 72, center.y).stroke({ width: 1.5, color: 0x67e8f9, alpha: 0.22 });
  graphics.moveTo(center.x, center.y - 72).lineTo(center.x, center.y + 72).stroke({ width: 1.5, color: 0x67e8f9, alpha: 0.22 });
}

function drawHitSparks(graphics: Graphics, center: Vec2, frame: number, count: number, color: number, alpha: number, angleBias: number): void {
  for (let index = 0; index < count; index += 1) {
    const angle = angleBias + index * 2.399 + Math.sin(frame * 0.03 + index) * 0.18;
    const length = 24 + (index % 6) * 9 + pulse(frame, index) * 12;
    const fromRadius = 10 + (index % 4) * 2;
    const from = { x: center.x + Math.cos(angle) * fromRadius, y: center.y + Math.sin(angle) * fromRadius };
    const to = { x: center.x + Math.cos(angle) * length, y: center.y + Math.sin(angle) * length * 0.72 };
    graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: index % 5 === 0 ? 3 : 2, color, alpha });
    if (index % 3 === 0) {
      graphics.circle(to.x, to.y, 2.5).fill({ color: 0xffffff, alpha: alpha * 0.72 });
    }
  }
}

function drawSlashMark(graphics: Graphics, center: Vec2, angleDegrees: number, color: number, alpha: number): void {
  const angle = angleDegrees * DEG;
  const dx = Math.cos(angle) * 56;
  const dy = Math.sin(angle) * 56;
  graphics.moveTo(center.x - dx, center.y - dy).lineTo(center.x + dx, center.y + dy).stroke({ width: 6, color, alpha });
  graphics.moveTo(center.x - dx * 0.7, center.y - dy * 0.7).lineTo(center.x + dx * 0.7, center.y + dy * 0.7).stroke({ width: 2, color: 0xffffff, alpha: Math.min(1, alpha + 0.12) });
}

function drawCracks(graphics: Graphics, center: Vec2, color: number): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI + index * 0.78;
    const joint = { x: center.x + Math.cos(angle) * 28, y: center.y + Math.sin(angle) * 20 };
    const end = { x: center.x + Math.cos(angle + 0.16) * (56 + (index % 3) * 16), y: center.y + Math.sin(angle - 0.12) * (40 + (index % 3) * 11) };
    graphics.moveTo(center.x, center.y).lineTo(joint.x, joint.y).lineTo(end.x, end.y).stroke({ width: 2, color, alpha: 0.72 });
  }
}

function drawIncomingBullet(graphics: Graphics, position: Vec2, blocked: boolean, radius = 10): void {
  const color = radius > 12 ? 0xf97316 : 0xef4444;
  const tail = blocked ? 36 : 24;
  graphics.moveTo(position.x - tail, position.y - 8).lineTo(position.x - 7, position.y - 2).stroke({ width: 3, color, alpha: 0.32 });
  graphics.circle(position.x, position.y, radius + 8).fill({ color, alpha: 0.18 });
  graphics.circle(position.x, position.y, radius).fill({ color: 0xffffff, alpha: 0.98 });
  graphics.circle(position.x, position.y, radius).stroke({ width: radius > 12 ? 5 : 3, color, alpha: 1 });
  if (!blocked) {
    graphics.circle(position.x, position.y, radius + 18).stroke({ width: 1.5, color: 0xfde68a, alpha: 0.2 });
  }
}

function drawBackground(graphics: Graphics, scenarioId: ScenarioId, t: number): void {
  const tint = scenarioId === "red_lotus_field" ? 0x1b0d14 : scenarioId === "tribulation_warning" ? 0x09091f : 0x06111b;
  graphics.rect(0, 0, WIDTH, HEIGHT).fill({ color: tint, alpha: 1 });
  graphics.rect(SAFE_LEFT, 0, SAFE_RIGHT - SAFE_LEFT, HEIGHT).fill({ color: 0x0a2530, alpha: 0.24 });
  for (let index = 0; index < 44; index += 1) {
    const x = (index * 173 + 97) % WIDTH;
    const y = (index * 251 + Math.round(t * 900)) % HEIGHT;
    graphics.circle(x, y, index % 9 === 0 ? 2 : 1).fill({ color: index % 4 === 0 ? 0xfde68a : 0x93c5fd, alpha: 0.28 });
  }
  for (let lane = 0; lane < 8; lane += 1) {
    const y = 120 + lane * 95;
    graphics.moveTo(SAFE_LEFT + 80, y + t * 70).lineTo(SAFE_RIGHT - 80, y - 64 + t * 70).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.08 });
  }
}

function drawPracticeBounds(graphics: Graphics): void {
  graphics.moveTo(SAFE_LEFT, 0).lineTo(SAFE_LEFT, HEIGHT).stroke({ width: 2, color: 0x34d399, alpha: 0.32 });
  graphics.moveTo(SAFE_RIGHT, 0).lineTo(SAFE_RIGHT, HEIGHT).stroke({ width: 2, color: 0x34d399, alpha: 0.32 });
}

function drawEnemies(graphics: Graphics, scenario: VfxScenario, frame: number): void {
  const count = scenario.id === "boss_death_cascade" ? 4 : scenario.id === "five_thunder_chain" ? 7 : 12;
  for (let index = 0; index < count; index += 1) {
    const angle = index * 1.64 + frame * 0.01;
    const radius = 130 + (index % 4) * 46;
    const x = 800 + Math.cos(angle) * radius;
    const y = scenario.id === "boss_death_cascade" ? 270 + Math.sin(angle) * 90 : 330 + Math.sin(angle * 0.9) * 110;
    drawEnemyGlyph(graphics, { x, y }, index);
  }
}

function drawEnemyGlyph(graphics: Graphics, position: Vec2, index: number): void {
  const color = [0xfb7185, 0xfacc15, 0xa78bfa, 0x22c55e][index % 4] ?? 0xfb7185;
  const points = [
    position.x,
    position.y - 30,
    position.x + 26,
    position.y + 8,
    position.x,
    position.y + 34,
    position.x - 26,
    position.y + 8
  ];
  graphics.poly(points).fill({ color: 0x0f172a, alpha: 0.92 }).stroke({ width: 3, color, alpha: 0.86 });
  graphics.circle(position.x, position.y, 7).fill({ color, alpha: 0.82 });
}

function drawEnemyBullets(graphics: Graphics, scenario: VfxScenario, frame: number, preset: VfxPreset): void {
  const count = Math.round(scenario.enemyBullets * (preset.id === "readable" ? 0.78 : preset.id === "flashy" ? 1.18 : 1));
  const anchor = scenario.id === "red_lotus_field" ? { x: 800, y: 520 } : scenario.playerPosition;
  graphics.circle(anchor.x + 16, anchor.y + 10, 17).fill({ color: 0xef4444, alpha: 0.18 });
  graphics.circle(anchor.x + 16, anchor.y + 10, 8).fill({ color: 0xffffff, alpha: 0.98 }).stroke({ width: 3, color: 0xef4444, alpha: 1 });
  for (let index = 1; index < count; index += 1) {
    const angle = (index * 137.5 + frame * 2.5) * DEG;
    const lane = SAFE_LEFT + 58 + (index % 8) * 122;
    const y = 150 + ((index * 37 + frame * 4) % 660);
    const x = lane + Math.cos(angle) * 32;
    const boss = index % 12 === 0;
    const radius = boss ? 14 : 7;
    graphics.circle(x, y, radius + 7).fill({ color: boss ? 0xf97316 : 0xef4444, alpha: 0.18 });
    graphics.circle(x, y, radius).fill({ color: 0xffffff, alpha: 0.98 });
    graphics.circle(x, y, radius).stroke({ width: boss ? 4 : 3, color: boss ? 0xf97316 : 0xef4444, alpha: 0.98 });
  }
}

function drawPlayer(graphics: Graphics, position: Vec2): void {
  graphics.poly([position.x, position.y - 34, position.x + 26, position.y + 28, position.x, position.y + 12, position.x - 26, position.y + 28])
    .fill({ color: 0x0f172a, alpha: 0.96 })
    .stroke({ width: 3, color: 0x67e8f9, alpha: 0.9 });
  graphics.circle(position.x, position.y, 31).stroke({ width: 2, color: 0x67e8f9, alpha: 0.38 });
  graphics.circle(position.x, position.y, 13).stroke({ width: 2, color: 0xfde68a, alpha: 0.92 });
  graphics.circle(position.x, position.y, 7).fill({ color: 0xffffff, alpha: 0.98 });
}

function drawLightning(graphics: Graphics, from: Vec2, to: Vec2, seed: number, color: number, width: number): void {
  const segments = 9;
  graphics.moveTo(from.x, from.y);
  for (let index = 1; index < segments; index += 1) {
    const p = index / segments;
    const x = lerp(from.x, to.x, p);
    const y = lerp(from.y, to.y, p);
    const normal = { x: to.y - from.y, y: from.x - to.x };
    const length = Math.max(1, Math.hypot(normal.x, normal.y));
    const jitter = Math.sin(seed * 12.989 + index * 78.233) * 18;
    graphics.lineTo(x + (normal.x / length) * jitter, y + (normal.y / length) * jitter);
  }
  graphics.lineTo(to.x, to.y).stroke({ width, color, alpha: width > 3 ? 0.78 : 0.95 });
}

function drawBurst(graphics: Graphics, center: Vec2, radius: number, color: number, alpha: number): void {
  graphics.circle(center.x, center.y, radius).stroke({ width: 3, color, alpha });
  graphics.circle(center.x, center.y, radius * 0.35).fill({ color: 0xffffff, alpha: alpha * 0.8 });
}

function drawCurveApprox(graphics: Graphics, from: Vec2, mid: Vec2, to: Vec2, color: number, alpha: number): void {
  graphics.moveTo(from.x, from.y);
  for (let step = 1; step <= 8; step += 1) {
    const p = step / 8;
    const x = (1 - p) ** 2 * from.x + 2 * (1 - p) * p * mid.x + p ** 2 * to.x;
    const y = (1 - p) ** 2 * from.y + 2 * (1 - p) * p * mid.y + p ** 2 * to.y;
    graphics.lineTo(x, y);
  }
  graphics.stroke({ width: 2, color, alpha });
}

function normalize(point: Vec2): Vec2 {
  return { x: point.x / WIDTH, y: point.y / HEIGHT };
}

function countFilters(container: Container): number {
  return container.filters?.length ?? 0;
}

function pulse(frame: number, offset: number): number {
  return (Math.sin(frame * 0.18 + offset) + 1) * 0.5;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function quadraticPoint(from: Vec2, mid: Vec2, to: Vec2, t: number): Vec2 {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT ** 2 * from.x + 2 * oneMinusT * t * mid.x + t ** 2 * to.x,
    y: oneMinusT ** 2 * from.y + 2 * oneMinusT * t * mid.y + t ** 2 * to.y
  };
}

function trianglePulse(value: number, start: number, end: number): number {
  if (value <= start || value >= end) {
    return 0;
  }
  const normalized = (value - start) / (end - start);
  return 1 - Math.abs(normalized * 2 - 1);
}

function positiveModulo(value: number, divisor: number): number {
  return ((Math.trunc(value) % divisor) + divisor) % divisor;
}

void new PixiVfxLab(queryUi()).init();
