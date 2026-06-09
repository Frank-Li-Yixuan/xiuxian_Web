# 测试与验收门槛 v0.1

## 1. 通用命令

每个阶段至少运行：

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

若存在：

```text
npm run validate:combat-assets
npm run validate:3d-assets
npm run validate:2d-assets
npm run validate:sim-redesign-data
```

## 2. 必测场景

### 2.1 命盘合理性

```text
低悟性低灵感不能原形天妒英才
高悟性低寿元支持天妒英才
低根骨高心性支持废灵逆命
高资质废灵逆命变异为天骄遭厄
魔心暗种 + 清净琉璃心变异为净莲藏影
```

### 2.2 隐藏信息不泄露

必须扫描：

```text
DOM text
visible ViewModel
月度日志
半年选择
LLM request
截图 OCR 可选
```

禁止提前出现：

```text
古雷真血
丹圣遗骨
系统共鸣体
前世剑魄
魔印微痕
太阴残脉
龙骨未醒
天书残页
```

### 2.3 模拟可复现

```text
同 seed + 同选择 + 同配置 → 216 个月结果一致
刷新恢复后 pending choice 不变
玩法插曲自动推演结果可复现
```

### 2.4 体验门槛

```text
首次人生模拟 8–12 分钟
熟悉后 4–6 分钟
快速推演 20–60 秒
每 6 个月停顿有明确原因
阶段总结可读
```

## 3. E2E 验收

完整链路：

```text
主菜单
  → 新游戏
  → 存档
  → 角色创建
  → 确认此生
  → 人生模拟
  → 成年节点
  → 首个试炼 / 洞府
```

## 4. 截图验收

至少：

```text
主菜单
存档页
角色创建页
重 Roll 后角色创建页
人生模拟播放中
半年选择
玩法插曲提示
阶段总结
成年节点
后续试炼/洞府入口
```
