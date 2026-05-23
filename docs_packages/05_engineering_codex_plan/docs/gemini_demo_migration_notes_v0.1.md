# 《Gemini Demo 迁移说明 v0.1》

## 1. 定位

Gemini Canvas Demo 是视觉和手感参考，不是正式工程基础。正式项目应从零建立模块化架构，并逐步翻译其中可用的视觉表现。

---

## 2. 保留方向

可以参考：

1. Canvas 2D 发光与阴影。
2. 玩家、敌人、Boss 的几何图形轮廓。
3. Boss 警告、Boss 血条、全屏 overlay。
4. 爆炸粒子、浮字、震屏。
5. 本地双人操作直觉。
6. `update → collision → draw` 的直观执行节奏。

---

## 3. 必须舍弃

正式工程必须舍弃：

1. 单 HTML 文件承载所有逻辑。
2. `entities` 全局对象无类型管理。
3. 玩家 `update` 直接读取全局 `keys`。
4. Gameplay 内部直接 `Math.random()`。
5. 冷却、Boss、粒子混用浮点 `dt`。
6. UI DOM、Canvas 渲染、Gameplay 状态混写。
7. Tailwind CDN、Google Fonts 等外部 runtime 资源。
8. 按键射击；正式版普攻由本命法宝自动发射。

---

## 4. 推荐迁移步骤

### Step 1：冻结 Demo

把 Demo 放到：

```text
docs/reference/gemini_canvas_demo.html
```

只作为参考，不进入打包产物。

### Step 2：抽象视觉风格

从 Demo 提取以下表现规则：

```text
玩家颜色
敌人颜色
Boss 警告颜色
爆炸粒子数量
震屏强度范围
浮字生命周期
背景星点密度
```

写入 `data/ui/ui_tokens.v0.1.json` 或 `data/render/effect_tokens.v0.1.json`。

### Step 3：从零实现 Simulation

先完成：

```text
SeededRng
FixedTickRunner
EntityManager
PlayerSystem
ArtifactSystem
ProjectileSystem
```

不要复制 Demo 的 Player/Enemy/Boss 类。

### Step 4：翻译 Canvas 表现

只在 `src/render/canvas/**` 中翻译：

```text
drawPlayer
绘制飞剑
绘制敌人轮廓
绘制粒子
绘制 Boss 血条
绘制警告文字
```

### Step 5：做视觉不影响 hash 的测试

关闭粒子和开启粒子，gameplay hash 必须一致。

---

## 5. 迁移验收标准

| 项 | 合格标准 |
|---|---|
| Demo 是否参与构建 | 否 |
| 正式 gameplay 是否读取 DOM keys | 否 |
| 正式 gameplay 是否调用 Math.random | 否 |
| 正式 UI 是否依赖 CDN | 否 |
| 正式 renderer 是否可关闭粒子 | 是 |
| 关闭粒子是否影响 hash | 否 |
