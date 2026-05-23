import type { CanvasPresentationVisualEvent } from "./CanvasPresentationState";
import type { Vec2 } from "./PrimitiveDrawing";

export interface RenderVfxParticle {
  readonly position: Vec2;
  readonly size: number;
  readonly color: string;
  readonly alpha: number;
}

export interface CreateRenderVfxParticlesOptions {
  readonly frame: number;
  readonly events: readonly CanvasPresentationVisualEvent[];
  readonly budget?: number;
}

export function createRenderVfxParticles(options: CreateRenderVfxParticlesOptions): readonly RenderVfxParticle[] {
  const budget = Math.max(0, options.budget ?? 800);
  const particles: RenderVfxParticle[] = [];

  for (const event of options.events) {
    if (particles.length >= budget) {
      break;
    }
    const age = Math.max(0, options.frame - event.frame);
    const life = eventLifeFrames(event);
    if (age > life) {
      continue;
    }
    const count = Math.min(eventParticleCount(event), budget - particles.length);
    const fade = 1 - age / Math.max(1, life);
    for (let index = 0; index < count; index += 1) {
      const seed = hash(`${event.id}:${index}`);
      const angle = ((seed % 3600) / 3600) * Math.PI * 2;
      const speed = 2 + ((seed >>> 8) % 70) / 10;
      const distance = speed * age;
      particles.push({
        position: {
          x: round2(event.position.x + Math.cos(angle) * distance),
          y: round2(event.position.y + Math.sin(angle) * distance)
        },
        size: 2 + ((seed >>> 16) % 4),
        color: event.color,
        alpha: round2(Math.max(0, Math.min(0.86, fade * (0.38 + ((seed >>> 24) % 40) / 100))))
      });
    }
  }

  return Object.freeze(particles);
}

function eventParticleCount(event: CanvasPresentationVisualEvent): number {
  switch (event.intensity) {
    case "ultimate":
      return 48;
    case "large":
      return 28;
    case "medium":
      return 16;
    case "small":
      return 10;
    default:
      return 5;
  }
}

function eventLifeFrames(event: CanvasPresentationVisualEvent): number {
  switch (event.intensity) {
    case "ultimate":
      return 72;
    case "large":
      return 48;
    case "medium":
      return 32;
    case "small":
      return 20;
    default:
      return 14;
  }
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
