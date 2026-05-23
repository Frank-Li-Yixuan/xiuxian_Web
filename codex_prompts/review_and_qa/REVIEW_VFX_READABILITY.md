# Review Prompt — VFX Readability

请审查 Canvas/VFX 实现是否符合 STG 可读性。

## 必须检查
1. 判定点始终可见。
2. 敌弹层级高于大多数玩家法术。
3. 雷劫预警高于敌弹和掉落物。
4. 法术爆炸不遮挡敌弹白芯和雷劫内圈。
5. 屏幕震动不影响 simulation 坐标。
6. 粒子数量有预算和高压压制。
7. 不依赖外部图片、字体、CDN 或音频。

## 输出
- 可读性风险。
- 性能风险。
- 建议调整的 VFX profile 或 layer。
