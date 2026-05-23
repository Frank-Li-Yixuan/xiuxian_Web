# FP-C009_spell_system — 实现 4 个主动法术系统

## Objective
实现 4 个主动法术系统。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/data/spells/spells.v0.1.json`
- `docs_packages/06_combat_feel_vfx/data/vfx/spell_vfx_profiles.v0.1.json`

## Allowed scope
- `src/sim/spells/SpellSystem.ts`
- `src/sim/spells/SpellEffects.ts`
- `tests/integration/spell-system.test.ts`

## Required work
1. 实现五雷正法、八卦剑阵、红莲业火、袖里乾坤
2. 消耗真元、冷却使用 frame
3. 产生 EffectEvent，不直接创建 Canvas 粒子
4. 普通清弹与不可清弹区分

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run typecheck
```
```bash
npm test -- spell-system
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
