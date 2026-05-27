# BAS-C012：质量门槛、截图、性能验收

## 目标

给战斗表现建立可验证的视觉与性能门槛。

## 任务

1. 新建脚本/测试或手动流程，输出截图到：

```text
artifacts/combat-asset-pass/YYYY-MM-DD/
```

2. 截图包含：
   - 初始战斗
   - 子弹/掉落
   - 命中/死亡
   - 法术特效
   - 丹药/法宝/灵宝
   - Boss/雷劫预警
   - 高密度压力

3. 运行：
   - validate:combat-assets
   - typecheck
   - test
   - build
   - check:forbidden

4. 报告：
   - FPS
   - 同屏 VFX
   - 音效 voices
   - 授权检查
   - 读弹问题
   - 截图路径

## 验收

- 截图能证明战斗视觉明显升级。
- 没有授权缺口。
- 没有 src/sim 修改。
- 读弹清楚。
- 性能不低于标准。
