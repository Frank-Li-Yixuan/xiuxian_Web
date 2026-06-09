# SIM-C002：数据 Registry 统一

## 目标

统一接入 SIM-REDESIGN 相关数据表，建立总 Registry 入口。

## 硬约束

- 不修改战斗模拟。
- 不改 UI 页面。
- 不执行 gameplay 重构。
- 不引入 generated PNG 控件方案。

## 任务

1. 建立或更新：

```text
src/data/SimRedesignRegistry.ts
src/data/registries/
```

2. 接入这些数据域，如果文件不存在则保持 planned 并记录缺口：

```text
world
nine_palace
destiny_v2
origin_fate_v02
life_storylines
life_interludes
life_stage
monthly_events_v02
major_choices_v02
llm_narrative
life_playable
```

3. 建立总校验脚本：

```text
scripts/validate-sim-redesign-data.mjs
```

4. 不删除旧数据，但给出新旧映射。

## 验收

```text
npm run typecheck
npm test
npm run build
npm run validate:data
node scripts/validate-sim-redesign-data.mjs
```

## 最终回复

- 新增/修改文件
- 已接入数据域
- planned 数据域
- 校验结果
