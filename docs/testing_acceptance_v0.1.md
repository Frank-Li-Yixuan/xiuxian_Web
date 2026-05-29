# 测试与验收 v0.1

## 1. 数据校验

命令：

```bash
node scripts/validate_age18_data.mjs
```

必须检查：

```text
所有 JSON 可解析
id 唯一
引用的 modifier / hook / item id 存在
stat formula key 合法
scenario phase 时间递增
home unlock module id 唯一
```

---

## 2. 确定性测试

同一输入：

```text
openingDraft
DestinySelectionState
OriginFateDraft
LifeSimulationState
MajorChoiceHistory
seed
```

多次调用 `resolveAge18Awakening` 必须完全一致。

---

## 3. 隐藏泄露测试

在创建页和 18 岁未揭示状态下，UI 不得显示：

```text
hiddenFate.trueName
internalId
exactProgress
debugWeight
```

测试应扫描可见 UI state。

---

## 4. 随身物转化测试

预设：

```text
残破木剑 + 前世剑魄
药铺铜炉 + 丹圣遗骨
祖传玉佩 + 功德高
黑骨短笛 + 太阴残脉 / 魔印
```

必须产生合理转化。

---

## 5. 第一战 RunConfig 测试

必须断言：

```text
modeId = outer_battlefield_intro
不读取 debug_run_config
player stats 存在
initial loadout 存在
scenario phases 存在
failurePolicy.retryable = true
```

---

## 6. 存档恢复测试

场景：

```text
18 岁结算完成后刷新页面
```

预期：

```text
不重新 Roll
读取同一个 awakeningResolution
读取同一个 outerBattlefieldIntroRunConfig
```

---

## 7. 第一战失败测试

预期：

```text
人生模拟结果保留
attempts +1
可重新挑战
若有废灵逆命，获得逆命点或相关 hook
```

---

## 8. 第一战成功测试

预期：

```text
生成 SystemHomeUnlockPlan
存档阶段变为 system_home_unlocked 或 dongfu
解锁草庐、聚灵阵基、藏经残壁
根据身世/随身物解锁额外线索
```

---

## 9. 关键预设角色验收

至少测试 4 个预设。

### 天妒雷修

```text
雷系/悟性高/寿元低
预期：法术奖励品质提高，雷劫或天道注视提示出现
```

### 苟道丹修

```text
苟道至尊 + 丹道奇才 + 药铺铜炉
预期：初始回春丹、潜修护盾、洞府炼丹线索
```

### 废灵剑修

```text
废灵逆命 + 残破木剑 + 前世剑魄
预期：开局较弱，首次濒死触发逆命，飞剑线索
```

### 魔心禁修

```text
魔心暗种 + 黑骨短笛 + 业力高
预期：心魔幻弹 / 高危奖励 / 洞府心魔线索
```

---

## 10. 手动验收

手动流程：

```text
创建角色
跑完 18 年人生模拟
进入 18 岁觉醒界面
查看解析结果
进入域外战场第一战
故意失败一次
重新挑战
成功后进入系统家园开启界面
进入洞府
```

必须感受到：

```text
十八年人生确实影响第一战
随身物被系统解析
天命有可见反馈
失败不毁档
战后洞府开启有仪式感
```
