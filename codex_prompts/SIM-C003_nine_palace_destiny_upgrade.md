# SIM-C003：九宫命盘与天命 v2 升级

## 目标

把角色创建中的属性/灵根/天命生成升级为：

```text
OpeningInnateDraft
  → NinePalaceEvaluation
  → DestinyEligibilityEvaluator
  → DestinyMutationResolver
  → DestinySelectionStateV2
```

## 前提

已完成：

```text
SIM-C002
OAG 基础系统
DT 基础系统
```

## 硬约束

- 不恢复旧 CC-C 角色创建布局。
- 不使用 generated PNG 控件。
- 不修改 `src/sim/**`。
- 不接人生模拟 UI。

## 任务

1. 实现 `NinePalaceEvaluator`：
   - talentScore
   - vesselScore
   - stabilityScore
   - destinyPressureScore
   - lateBloomScore
   - rebellionScore
   - wuxingInclinations
   - causalityTags

2. 实现 `DestinyEligibilityEvaluator`：
   - eligible
   - supportSignals
   - antiSignals
   - mutationCandidate

3. 实现 `DestinyMutationResolver`：
   - 天妒英才 → 妄承天机 / 慧极易折
   - 废灵逆命 → 天骄遭厄
   - 魔心暗种 + 清净琉璃心 → 净莲藏影
   - 福星高照 + 天煞孤星 → 孤星护命

4. CharacterCreationController 的 reroll 读取新逻辑。

5. ViewModel 显示变异命格时必须解释“为何变异”。

## 必测用例

- 低悟性低灵感不能原形天妒英才。
- 高悟性低寿元支持天妒英才。
- 低根骨高心性支持废灵逆命。
- 高资质废灵逆命变异为天骄遭厄。
- 魔心暗种 + 清净琉璃心变异为净莲藏影。

## 命令

```text
npm run typecheck
npm test
npm run build
node scripts/validate-sim-redesign-data.mjs
```
